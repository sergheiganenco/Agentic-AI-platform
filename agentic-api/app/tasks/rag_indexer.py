from __future__ import annotations
from celery import shared_task
from sqlalchemy import text
from app.db.session import SessionLocal
from app.api.routes.ai_rag import IndexItem
from app.utils.llm import embed_text, LLM_ENABLED
from app.service.vectorstore.factory import get_vector_store

@shared_task(name="rag.index_latest")
def index_latest(scan_id: str | None = None, tenant_id: str = "default") -> int:
    if not LLM_ENABLED:
        return 0
    db = SessionLocal()
    total = 0
    try:
        rows = db.execute(text("""
            SELECT prc.table_name, prc.column_name, prc.data_type, prc.null_percent,
                   prc.distinct_percent, prc.is_pii, prc.quality_score
            FROM profile_result_column prc
            JOIN profile_run pr ON prc.run_id = pr.id
            WHERE (:scan_id IS NULL OR pr.scan_id = :scan_id)
            ORDER BY prc.table_name, prc.column_name
            LIMIT 2000
        """), {"scan_id": scan_id}).fetchall()
        if not rows:
            return 0

        items = []
        for r in rows:
            title = f"{r.table_name}.{r.column_name}"
            chunk = (f"{title} | type={r.data_type} | null%={r.null_percent} | "
                     f"distinct%={r.distinct_percent} | pii={r.is_pii} | qscore={r.quality_score}")
            items.append(IndexItem(object_type="profile", object_id=title, title=title,
                                   chunk=chunk, metadata={}, tenant_id=tenant_id))

        # embed in batches to keep memory in check
        BATCH = 100
        store = get_vector_store()
        for i in range(0, len(items), BATCH):
            batch = items[i:i+BATCH]
            chunks = [b.chunk for b in batch]
            emb = _embed_sync(chunks)  # helper below
            if not emb or not emb.get("ok"):
                break
            vectors = emb["vectors"]
            from app.service.vectorstore.base import VSItem
            vs_items = [VSItem(object_type=b.object_type, object_id=b.object_id, title=b.title,
                               chunk=b.chunk, metadata=b.metadata, tenant_id=b.tenant_id) for b in batch]
            # run upsert sync (Celery task is already off the main loop)
            import asyncio
            asyncio.run(store.upsert(vs_items, vectors))
            total += len(batch)
        return total
    finally:
        db.close()

def _embed_sync(chunks):
    import asyncio
    return asyncio.run(embed_text(chunks))
