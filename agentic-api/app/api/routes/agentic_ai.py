from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.scan_job import ScanJobResult
from app.utils.llm import ask_llm
from app.db import SessionLocal
import json
import re

router = APIRouter()

class AgenticAiQueryRequest(BaseModel):
    query: str
    scan_job_id: int

class AgenticAiQueryResponse(BaseModel):
    answer: str
    sql: str = None
    columns: list[str] = []
    table: list[dict] = []

def is_safe_sql(sql: str) -> bool:
    """Check if the SQL is safe (SELECT only, no modification)."""
    return bool(re.match(r"(?i)^\s*select\b", sql or ""))

@router.post("/agentic-ai/query", response_model=AgenticAiQueryResponse)
async def agentic_ai_query(req: AgenticAiQueryRequest):
    # Load scan metadata from DB
    db = SessionLocal()
    try:
        scan_result = db.query(ScanJobResult).filter_by(scan_job_id=req.scan_job_id).first()
        if not scan_result:
            raise HTTPException(status_code=404, detail="Scan results not found.")

        metadata = json.loads(scan_result.metadata_json)
        # Format schema for LLM context
        schema_context = ""
        for obj in metadata.get("objects", []):
            if obj.get("object_type") in ("table", "view"):
                schema_context += f"Table: {obj['table']}\n"
            if obj.get("object_type") in ("table_column", "view_column"):
                schema_context += f"  - {obj['name']} ({', '.join(obj.get('types', []))})\n"

        prompt = f"""
You are an expert AI database assistant.
Schema:
{schema_context}

User question: {req.query}

INSTRUCTIONS:
- Provide a clear natural language answer.
- If relevant, provide a safe SQL query (SELECT only!) as a markdown block.
- List the column names.
- If possible, provide a few sample rows (fake data if needed).
- Never answer outside the schema.
Always respond in this JSON format:
{{
  "answer": "...",
  "sql": "...",
  "columns": ["col1", "col2", ...],
  "table": [{{"col1": "...", "col2": "..."}}, ...]
}}
"""

        # Ask the LLM
        llm_response = await ask_llm(prompt)

        # Parse LLM output as JSON
        try:
            data = json.loads(llm_response)
        except Exception:
            # Fallback: wrap as text only
            data = {"answer": llm_response, "sql": None, "columns": [], "table": []}

        # Enforce SQL safety
        if data.get("sql") and not is_safe_sql(data["sql"]):
            data["answer"] += "\n\n(Note: Generated SQL was not safe, so it was removed.)"
            data["sql"] = None
            data["columns"] = []
            data["table"] = []

        return AgenticAiQueryResponse(**data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agentic AI error: {str(e)}")
    finally:
        db.close()
