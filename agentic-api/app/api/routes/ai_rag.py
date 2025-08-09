from __future__ import annotations

import logging
import os
from typing import Optional, List, Dict, Any, Annotated, Tuple, Literal
import re
import time

from fastapi import APIRouter, HTTPException, status, Request, Body
from pydantic import BaseModel, Field, constr, ConfigDict, conint

from app.core.limiter import limiter
from app.utils.llm import embed_text, ask_llm, LLM_ENABLED
from app.service.vectorstore.factory import get_vector_store
from app.service.vectorstore.base import VSItem

router = APIRouter()
log = logging.getLogger(__name__)

# --------- Config knobs (env-driven) ----------
TOP_K = max(1, min(int(os.getenv("RAG_TOP_K", "8")), 50))
TENANCY_MODE = (os.getenv("TENANCY_MODE") or "single").lower()  # 'single' | 'multi'
MAX_INDEX_ITEMS = 200
MAX_CHUNK_CHARS = 4000  # guard against runaway payloads
MAX_QUESTION_LEN = 1000
ASK_TIMEOUT_SEC = 25.0
# ---------------------------------------------

# --------- Sanitization (avoid indexing secrets) ----------
RE_EMAIL = re.compile(r"([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})", re.I)
RE_SSN   = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

def sanitize(text: str) -> str:
    text = RE_EMAIL.sub("[EMAIL]", text)
    text = RE_SSN.sub("[SSN]", text)
    return text
# ---------------------------------------------------------

# --------- Schemas ----------
class SourceRef(BaseModel):
    id: str
    object_type: str
    object_id: str
    title: Optional[str] = None

class IndexItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    object_type: constr(strip_whitespace=True, min_length=3, max_length=32)  # asset|column|profile|policy
    object_id: constr(strip_whitespace=True, min_length=1, max_length=256)
    title: Optional[constr(max_length=512)] = None
    chunk: constr(strip_whitespace=True, min_length=10, max_length=MAX_CHUNK_CHARS)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tenant_id: Optional[str] = None

class IndexPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: Annotated[List[IndexItem], Field(min_length=1, max_length=MAX_INDEX_ITEMS)]

class IndexResponse(BaseModel):
    status: Literal["ok"]
    indexed: conint(ge=0, le=MAX_INDEX_ITEMS)

class QueryPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: constr(strip_whitespace=True, min_length=3, max_length=MAX_QUESTION_LEN)
    tenant_id: Optional[str] = None  # will be removed once auth/tenant derivation is wired

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceRef]
# ---------------------------------------------

# --------- Helpers ----------
def _store():
    if not hasattr(_store, "_instance"):
        vs = get_vector_store()
        log.info("vector_store_ready backend=%s", vs.__class__.__name__)
        setattr(_store, "_instance", vs)
    return getattr(_store, "_instance")

def _require_tenant_if_multi(tenant_id: Optional[str]) -> None:
    if TENANCY_MODE == "multi" and not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id is required in multi-tenant mode")

def _dedupe_items(items: List[IndexItem]) -> List[IndexItem]:
    seen: set[Tuple[Optional[str], str, str, str]] = set()
    uniq: List[IndexItem] = []
    for it in items:
        key = (it.tenant_id, it.object_type, it.object_id, it.chunk)
        if key not in seen:
            seen.add(key)
            uniq.append(it)
    return uniq

def _build_prompt_blocks(rows: List[Dict[str, Any]]) -> tuple[str, List[SourceRef]]:
    context_blocks: List[str] = []
    sources: List[SourceRef] = []
    for r in rows:
        rid = str(r.get("id", ""))
        title = (r.get("title") or "")[:200]
        chunk = r.get("chunk", "") or ""
        context_blocks.append(f"[{rid}] {title}\n{chunk}")
        sources.append(SourceRef(
            id=rid,
            object_type=str(r.get("object_type", "")),
            object_id=str(r.get("object_id", "")),
            title=title or None,
        ))
    return "\n\n---\n\n".join(context_blocks), sources
# ---------------------------------------------------------

# --------- Routes ----------
@router.post(
    "/index",
    response_model=IndexResponse,
    status_code=status.HTTP_200_OK,
    summary="Index documents/chunks for RAG",
)
@limiter.limit("120/minute")
async def rag_index(payload: IndexPayload, request: Request) -> IndexResponse:
    if not LLM_ENABLED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="LLM not configured")

    if TENANCY_MODE == "multi" and any(i.tenant_id in (None, "") for i in payload.items):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each item must include tenant_id in multi-tenant mode")

    items = _dedupe_items(payload.items)
    if not items:
        return IndexResponse(status="ok", indexed=0)

    # Sanitize + embed
    chunks = [sanitize(i.chunk) for i in items]

    t0 = time.perf_counter()
    try:
        emb = await embed_text(chunks)
    except Exception:
        log.exception("Embedding call raised")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Embedding call failed")
    log.info("rag.embed_ms=%d", int((time.perf_counter() - t0) * 1000))

    if not emb.get("ok"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Embedding failed")
    vectors: List[List[float]] = emb["vectors"]

    vs_items = [
        VSItem(
            object_type=i.object_type,
            object_id=i.object_id,
            title=i.title,
            chunk=i.chunk,
            metadata=i.metadata,
            tenant_id=i.tenant_id,
        )
        for i in items
    ]

    try:
        t1 = time.perf_counter()
        indexed = await _store().upsert(vs_items, vectors)
        log.info("rag.vs_upsert_ms=%d indexed=%d", int((time.perf_counter() - t1) * 1000), indexed)
        return IndexResponse(status="ok", indexed=indexed)
    except Exception:
        log.exception("VectorStore upsert error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Indexing failed")

@router.post(
    "/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query RAG and get an LLM-composed answer with sources",
)
@limiter.limit("60/minute")
async def rag_query(payload: QueryPayload, request: Request) -> QueryResponse:
    if not LLM_ENABLED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="LLM not configured")
    _require_tenant_if_multi(payload.tenant_id)

    t0 = time.perf_counter()
    try:
        emb = await embed_text([payload.question])
    except Exception:
        log.exception("Embedding call raised")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Embedding call failed")
    log.info("rag.embed_ms=%d", int((time.perf_counter() - t0) * 1000))

    if not emb.get("ok"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Embedding failed")
    qvec: List[float] = emb["vectors"][0]

    try:
        t1 = time.perf_counter()
        rows = await _store().query(qvec, TOP_K, payload.tenant_id)
        log.info("rag.vs_query_ms=%d results=%d", int((time.perf_counter() - t1) * 1000), len(rows))
    except Exception:
        log.exception("VectorStore query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Search failed")

    if not rows:
        return QueryResponse(answer="No relevant context found.", sources=[])

    context, sources = _build_prompt_blocks(rows)
    messages = [{
        "role": "user",
        "content": (
            "Use the following context to answer. Cite sources by their [id] where appropriate.\n\n"
            + context +
            f"\n\nQuestion: {payload.question}\n"
        )
    }]

    try:
        t2 = time.perf_counter()
        result = await ask_llm(messages, max_tokens=700, timeout=ASK_TIMEOUT_SEC)
        log.info("rag.llm_ms=%d", int((time.perf_counter() - t2) * 1000))
    except Exception:
        log.exception("LLM call raised")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service error")

    if not result.get("ok"):
        log.warning("LLM error: %s", result.get("message"))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service temporarily unavailable")

    answer = (result.get("answer") or "").strip() or "No answer generated."
    return QueryResponse(answer=answer, sources=sources)

@router.post("/_schema_probe")
async def _schema_probe(payload: IndexPayload):
    return {"ok": True}