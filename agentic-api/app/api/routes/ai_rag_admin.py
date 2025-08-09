# app/api/routes/ai_rag_admin.py
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query
from app.tasks.rag_indexer import index_latest

router = APIRouter(prefix="/ai/rag", tags=["AI RAG Admin"])
log = logging.getLogger(__name__)

@router.post("/reindex", status_code=status.HTTP_202_ACCEPTED, summary="Queue a background reindex")
def trigger_reindex(
    scan_id: Optional[str] = Query(None, description="Restrict reindex to a specific scan id"),
    tenant_id: str = Query("default", min_length=1, description="Tenant id (default for single-tenant)"),
):
    try:
        async_result = index_latest.delay(scan_id, tenant_id)  # requires Celery worker/broker up
        return {"status": "queued", "task_id": async_result.id}
    except Exception as e:
        log.exception("Failed to queue reindex")
        raise HTTPException(status_code=500, detail=f"Failed to queue reindex: {e}")
