from __future__ import annotations

import json
import logging
from typing import List, Dict, Any, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, constr, ConfigDict
from sqlalchemy import text, bindparam
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import SessionLocal
from app.utils.llm import ask_llm, LLM_ENABLED

router = APIRouter()
log = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PolicyDef(BaseModel):
    name: constr(strip_whitespace=True, min_length=3, max_length=256)
    type: constr(strip_whitespace=True, min_length=3, max_length=64)  # masking|retention|access|residency
    scope: Dict[str, Any] = Field(default_factory=dict)              # {tables:[], columns:[]}
    definition: Dict[str, Any] = Field(default_factory=dict)         # normalized payload
    confidence: float = Field(ge=0, le=1, default=0.7)

class SuggestPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_id: Optional[str] = None
    tables: List[str] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    tenant_id: Optional[str] = None

class SuggestResponse(BaseModel):
    policies: List[PolicyDef]

def _portable_profile_query(has_tables: bool, has_columns: bool) -> Tuple[str, Dict[str, Any]]:
    """
    Build SQL that works on SQLite/Postgres by using expanding bindparams for IN clauses.
    """
    base = """
      SELECT prc.table_name, prc.column_name, prc.data_type, prc.is_pii, prc.null_percent,
             prc.distinct_percent, prc.quality_score
      FROM profile_result_column prc
      JOIN profile_run pr ON prc.run_id = pr.id
      WHERE (:scan_id IS NULL OR pr.scan_id = :scan_id)
    """
    params: Dict[str, Any] = {}
    where_extra = ""
    if has_tables:
        where_extra += " AND prc.table_name IN :tables "
        params["tables"] = []  # list provided at call
    if has_columns:
        where_extra += " AND prc.column_name IN :columns "
        params["columns"] = []  # list provided at call
    order_limit = " ORDER BY prc.table_name, prc.column_name LIMIT 400 "
    return base + where_extra + order_limit, params

@router.post("/policies/suggest", response_model=SuggestResponse, summary="Suggest governance policies from profiling context")
async def suggest_policies(payload: SuggestPayload, db=Depends(get_db)):
    if not LLM_ENABLED:
        raise HTTPException(status_code=503, detail="LLM not configured")

    sql, params = _portable_profile_query(bool(payload.tables), bool(payload.columns))
    params.update({
        "scan_id": payload.scan_id,
        "tables": payload.tables,
        "columns": payload.columns,
    })

    try:
        stmt = text(sql)
        if "tables" in params and params["tables"]:
            stmt = stmt.bindparams(bindparam("tables", expanding=True))
        if "columns" in params and params["columns"]:
            stmt = stmt.bindparams(bindparam("columns", expanding=True))
        rows = db.execute(stmt, params).fetchall()
    except SQLAlchemyError:
        log.exception("Failed to fetch profiling context")
        raise HTTPException(status_code=500, detail="Failed to load profiling context")

    context_lines = [
        f"{getattr(r, 'table_name')}.{getattr(r, 'column_name')} | type={getattr(r,'data_type')} | "
        f"pii={getattr(r,'is_pii')} | null%={getattr(r,'null_percent')} | "
        f"distinct%={getattr(r,'distinct_percent')} | qscore={getattr(r,'quality_score')}"
        for r in rows
    ]
    context = "\n".join(context_lines) if context_lines else "No profiling rows."

    messages = [{
        "role": "user",
        "content": (
            "From the following profiling context, propose governance policies "
            "(masking, retention, access, residency). "
            "Output strict JSON list under key 'policies' where each item is "
            "{name,type,scope:{tables,columns},definition,confidence}.\n\n"
            f"{context}"
        )
    }]

    result = await ask_llm(messages, max_tokens=700, timeout=30.0)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

    # Parse defensively
    try:
        parsed = json.loads(result["answer"])
        items = parsed.get("policies", [])
        policies = [PolicyDef(**p) for p in items if isinstance(p, dict)]
    except Exception:
        policies = []

    # Persist suggestion (portable JSON storage)
    try:
        # Use a simple TEXT column in SQLite and store JSON-serialized string.
        db.execute(
            text("""
                INSERT INTO policy_suggestion (tenant_id, scan_id, suggested_by, policies, status)
                VALUES (:tenant_id, :scan_id, :by, :policies, 'pending')
            """),
            {
                "tenant_id": payload.tenant_id,
                "scan_id": payload.scan_id,
                "by": "ai",
                "policies": json.dumps([p.model_dump() for p in policies]),
            },
        )
        db.commit()
    except SQLAlchemyError:
        log.exception("Failed to persist policy suggestion")

    return SuggestResponse(policies=policies)

class ApplyPayload(BaseModel):
    suggestion_id: int
    approve_all: bool = True  # reserved for future use

@router.post("/policies/apply", summary="Apply a policy suggestion to active policies")
def apply_policies(payload: ApplyPayload, db=Depends(get_db)):
    try:
        sug = db.execute(text("SELECT * FROM policy_suggestion WHERE id = :id"), {"id": payload.suggestion_id}).fetchone()
        if not sug:
            raise HTTPException(status_code=404, detail="Suggestion not found")

        # policies column is JSON string in SQLite; parse it
        raw = getattr(sug, "policies", "[]") or "[]"
        try:
            items = json.loads(raw)
        except Exception:
            items = []

        applied = 0
        for p in items:
            if not isinstance(p, dict):
                continue
            db.execute(
                text("""
                    INSERT INTO policy (tenant_id, name, type, scope, definition, status, created_by)
                    VALUES (:tenant_id, :name, :type, :scope, :definition, 'active', :by)
                """),
                {
                    "tenant_id": getattr(sug, "tenant_id", None),
                    "name": p.get("name"),
                    "type": p.get("type"),
                    "scope": json.dumps(p.get("scope", {})),
                    "definition": json.dumps(p.get("definition", {})),
                    "by": "ai-apply",
                },
            )
            applied += 1

        db.execute(text("UPDATE policy_suggestion SET status='applied' WHERE id=:id"), {"id": payload.suggestion_id})
        db.commit()
        return {"applied": applied}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to apply policies")
