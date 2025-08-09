from __future__ import annotations
import os
from .base import VectorStore
from .chroma_store import ChromaStore
# (You can add pgvector/azure/pinecone/qdrant later)

def get_vector_store() -> VectorStore:
    backend = (os.getenv("VECTOR_BACKEND") or "chroma").lower()
    if backend == "chroma":
        persist_path = os.getenv("CHROMA_PERSIST_PATH", "./chroma_data")
        collection = os.getenv("CHROMA_COLLECTION", "agentic_rag")
        return ChromaStore(persist_path, collection)
    # Future backends:
    # elif backend == "pgvector": ...
    # elif backend == "azure": ...
    # elif backend == "pinecone": ...
    # elif backend == "qdrant": ...
    raise RuntimeError(f"Unsupported VECTOR_BACKEND={backend}")
