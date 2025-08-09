from __future__ import annotations
from typing import List, Dict, Any, Protocol, Optional
from dataclasses import dataclass

@dataclass(frozen=True)
class VSItem:
    object_type: str
    object_id: str
    title: Optional[str]
    chunk: str
    metadata: Dict[str, Any]
    tenant_id: Optional[str] = None

class VectorStore(Protocol):
    async def upsert(self, items: List[VSItem], embeddings: List[List[float]]) -> int: ...
    async def query(self, query_embedding: List[float], top_k: int, tenant_id: Optional[str]) -> List[Dict[str, Any]]: ...
