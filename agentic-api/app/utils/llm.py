# app/utils/llm.py
import os, asyncio
from typing import Iterable, Optional, Dict, Any
from openai import AsyncOpenAI, OpenAIError

OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()
LLM_ENABLED = bool(OPENAI_API_KEY)

_client: Optional[AsyncOpenAI] = AsyncOpenAI(api_key=OPENAI_API_KEY) if LLM_ENABLED else None

SYSTEM_PROMPT = (
    "You are an AI assistant for a data governance platform. "
    "Given scan results (schemas, columns, types, quality metrics, sensitivity) "
    "you will: (1) answer questions, (2) surface PII/sensitive data, "
    "(3) recommend fixes (masking, constraints, quality rules), "
    "(4) note false positives and caveats concisely."
)

async def ask_llm(messages: Iterable[Dict[str, str]], *, max_tokens: int = 600, timeout: float = 20.0) -> Dict[str, Any]:
    if not LLM_ENABLED or _client is None:
        return {"ok": False, "error": "LLM_NOT_CONFIGURED", "message": "OpenAI key not set"}

    try:
        async def _call():
            resp = await _client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "system", "content": SYSTEM_PROMPT}, *messages],
                temperature=0.2,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content

        # Hard timeout guard
        return {"ok": True, "answer": await asyncio.wait_for(_call(), timeout=timeout)}
    except (asyncio.TimeoutError, OpenAIError) as e:
        return {"ok": False, "error": "LLM_ERROR", "message": str(e)}
