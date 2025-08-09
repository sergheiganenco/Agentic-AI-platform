from __future__ import annotations
import os, hashlib, asyncio
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from .base import VectorStore, VSItem

def _hash_key(tenant_id: Optional[str], object_type: str, object_id: str, chunk: str) -> str:
    base = f"{tenant_id or ''}|{object_type}|{object_id}|{chunk}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()

class ChromaStore(VectorStore):
    def __init__(self, persist_path: str, collection_name: str):
        os.makedirs(persist_path, exist_ok=True)
        self._client = chromadb.PersistentClient(path=persist_path, settings=Settings(allow_reset=False))
        # cosine space is default, good for OpenAI embeddings
        self._col = self._client.get_or_create_collection(name=collection_name)

    async def upsert(self, items: List[VSItem], embeddings: List[List[float]]) -> int:
        if len(items) != len(embeddings):
            raise ValueError("items and embeddings length mismatch")

        def _do():
            ids = [_hash_key(it.tenant_id, it.object_type, it.object_id, it.chunk) for it in items]
            documents = [it.chunk for it in items]
            metadatas: List[Dict[str, Any]] = [{
                "tenant_id": it.tenant_id,
                "object_type": it.object_type,
                "object_id": it.object_id,
                "title": it.title,
                **(it.metadata or {})
            } for it in items]
            # Chroma upsert (will insert or overwrite existing ids)
            self._col.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)
            return len(ids)

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _do)

    async def query(self, query_embedding: List[float], top_k: int, tenant_id: Optional[str]) -> List[Dict[str, Any]]:
        def _do():
            where = {"tenant_id": tenant_id} if tenant_id else None
            res = self._col.query(query_embeddings=[query_embedding], n_results=int(top_k), where=where)
            out: List[Dict[str, Any]] = []
            ids = res.get("ids", [[]])[0]
            docs = res.get("documents", [[]])[0]
            metas = res.get("metadatas", [[]])[0]
            for _id, doc, meta in zip(ids, docs, metas):
                out.append({
                    "id": _id,
                    "object_type": str(meta.get("object_type", "")),
                    "object_id": str(meta.get("object_id", "")),
                    "title": meta.get("title"),
                    "chunk": doc,
                    "metadata": meta,
                })
            return out

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _do)
