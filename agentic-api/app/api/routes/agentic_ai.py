# app/api/routes/agentic_ai.py
from __future__ import annotations

import logging
from typing import Optional, List, Dict, Any, Tuple

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field, constr, conlist, ConfigDict
from sqlalchemy import text, bindparam
from sqlalchemy.exc import SQLAlchemyError

from app.utils.llm import ask_llm, LLM_ENABLED
from app.db.session import SessionLocal
from slowapi.util import get_remote_address
from slowapi import Limiter

router = APIRouter()
log = logging.getLogger(__name__)

# --- Config knobs (centralized for easy tuning) ---
MAX_CONTEXT_ROWS = 600            # hard cap on rows pulled into prompt
MAX_TABLES_FILTER = 50            # avoid massive IN clauses
MAX_QUESTION_LEN = 1_000          # protect LLM & logs
DEFAULT_ROW_LIMIT = 500           # per-scan default fetch limit (<= MAX_CONTEXT_ROWS)

# If you're already attaching a global limiter in app.main, you can reuse it:
limiter: Limiter | None = getattr(router, "limiter", None)  # app.main may set app.state.limiter
# ---------------------------------------------------


# --- DB dependency (explicit, testable) ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Schemas ---
class AskPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scan_id: Optional[constr(strip_whitespace=True, min_length=1, max_length=200)] = Field(
        default=None, description="Scan/job ID to scope context"
    )
    scope_tables: Optional[conlist(constr(strip_whitespace=True, min_length=1, max_length=256), max_items=MAX_TABLES_FILTER)] = Field(
        default=None, description="Optional list of table names to focus on"
    )
    question: constr(strip_whitespace=True, min_length=3, max_length=MAX_QUESTION_LEN)
    row_limit: Optional[int] = Field(
        default=DEFAULT_ROW_LIMIT, ge=1, le=MAX_CONTEXT_ROWS, description="Max rows to include from profiling results"
    )

class AskResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str
    context_summary: Optional[str] = Field(
        default=None, description="Short note of what context was used (counts, truncation hints)"
    )


# --- Internal helpers ---
def _normalize_table_list(scope_tables: Optional[List[str]]) -> Optional[List[str]]:
    if not scope_tables:
        return None
    # Deduplicate & preserve order
    seen = set()
    out: List[str] = []
    for t in scope_tables:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out[:MAX_TABLES_FILTER]


def _fetch_scan_context(
    db, scan_id: Optional[str], scope_tables: Optional[List[str]], row_limit: int
) -> Tuple[str, str]:
    """
    Builds a compact, model-friendly context string from profiling tables.
    Returns: (context_text, summary_text)
    """
    if not scan_id:
        return "No scan context provided.", "context=none (no scan_id)"

    # NOTE: Adjust table/column names to your schema.
    # This query assumes tables: profile_result_column (prc), profile_run (pr)
    base_sql = """
        SELECT
            prc.table_name      AS table_name,
            prc.column_name     AS column_name,
            prc.data_type       AS data_type,
            prc.null_percent    AS null_percent,
            prc.distinct_percent AS distinct_percent,
            prc.is_pii          AS is_pii,
            prc.quality_score   AS quality_score
        FROM profile_result_column prc
        JOIN profile_run pr ON prc.run_id = pr.id
        WHERE pr.scan_id = :scan_id
    """

    params: Dict[str, Any] = {"scan_id": scan_id, "row_limit": int(row_limit)}

    table_filter_sql = ""
    if scope_tables:
        # Use list-expanding bindparam for safe IN (...)
        scope_tables = _normalize_table_list(scope_tables)
        if scope_tables:
            table_filter_sql = " AND prc.table_name IN :tables "
            params["tables"] = scope_tables  # expanded safely via bindparam(expanding=True)

    order_limit_sql = " ORDER BY prc.table_name, prc.column_name LIMIT :row_limit "
    sql = base_sql + table_filter_sql + order_limit_sql

    try:
        stmt = text(sql)
        if "tables" in params:
            stmt = stmt.bindparams(bindparam("tables", expanding=True))
        rows = db.execute(stmt, params).fetchall()
    except SQLAlchemyError as e:
        log.exception("DB error while fetching scan context")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load scan context") from e

    if not rows:
        return "No rows found for the given scan.", "context=empty"

    # Build compact lines. Keep stable ordering & predictable formatting for the prompt.
    lines: List[str] = []
    for r in rows:
        # Be defensive with None values to avoid 'None' noise in prompts.
        table = (getattr(r, "table_name", "") or "").strip()
        col = (getattr(r, "column_name", "") or "").strip()
        dtype = (getattr(r, "data_type", "") or "").strip()
        nullp = getattr(r, "null_percent", None)
        distp = getattr(r, "distinct_percent", None)
        pii = getattr(r, "is_pii", None)
        qscore = getattr(r, "quality_score", None)
        lines.append(
            f"{table}.{col} | type={dtype} | null%={nullp if nullp is not None else 'na'} | "
            f"distinct%={distp if distp is not None else 'na'} | pii={pii if pii is not None else 'na'} | "
            f"qscore={qscore if qscore is not None else 'na'}"
        )

    # Final prompt context
    context_text = "SCAN CONTEXT:\n" + "\n".join(lines[:MAX_CONTEXT_ROWS])
    summary = f"context_rows={len(lines)}; included={min(len(lines), MAX_CONTEXT_ROWS)}; tables={len(scope_tables or [])}"
    return context_text, summary


def _build_messages(question: str, context: str) -> List[Dict[str, str]]:
    # Use a minimal user message; system behavior/guardrails belong in app.utils.llm
    return [
        {
            "role": "user",
            "content": (
                "You are assisting with data governance over scanned metadata and profiling results.\n"
                "Answer precisely and propose concrete actions (masking rules, constraints, alerts, owners, remediation steps).\n"
                "If information is insufficient, say what additional data is needed.\n\n"
                f"Question: {question}\n\n{context}\n"
            ),
        }
    ]


# --- Route ---
@router.post(
    "/ask",
    response_model=AskResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask the AI assistant about a scan and receive actionable guidance",
)
# Optional: tighten abuse with a route-level limiter if you have slowapi configured globally
# If you already attach limiter in app.main, enable the decorator below and import limiter properly.
# @limiter.limit("20/minute")
async def ask_ai(payload: AskPayload, db=Depends(get_db)) -> AskResponse:
    if not LLM_ENABLED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="LLM not configured")

    # Basic input hardening is handled by Pydantic constraints; add any business rules here:
    if payload.scope_tables and len(payload.scope_tables) > MAX_TABLES_FILTER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"scope_tables cannot exceed {MAX_TABLES_FILTER}")

    # Fetch scoped context
    context_text, context_summary = _fetch_scan_context(
        db=db,
        scan_id=payload.scan_id,
        scope_tables=payload.scope_tables,
        row_limit=payload.row_limit or DEFAULT_ROW_LIMIT,
    )

    # Build LLM request
    messages = _build_messages(payload.question, context_text)

    # Call LLM with strong error boundaries
    result = await ask_llm(messages, max_tokens=700, timeout=25.0)
    if not result.get("ok"):
        # Log the underlying error but avoid leaking internals to clients
        log.warning("LLM error: %s", result.get("message"))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service temporarily unavailable")

    answer = (result.get("answer") or "").strip()
    if not answer:
        answer = "No answer generated."

    return AskResponse(answer=answer, context_summary=context_summary)
