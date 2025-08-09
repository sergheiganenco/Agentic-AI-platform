from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context var for request_id, used by your JSON logger
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

log = logging.getLogger("observability")

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # get or create a request id
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        token = request_id_ctx.set(rid)

        t0 = time.perf_counter()
        response: Response | None = None
        try:
            response = await call_next(request)
            return response
        except Exception:
            # log the exception; status will be 500 below
            log.exception("unhandled_error", extra={"request_id": rid})
            raise
        finally:
            dur_ms = int((time.perf_counter() - t0) * 1000)
            status = getattr(response, "status_code", 500)
            try:
                log.info(
                    "request_complete",
                    extra={
                        "request_id": rid,
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": status,
                        "duration_ms": dur_ms,
                        "client_ip": request.client.host if request.client else None,
                        "user_agent": request.headers.get("user-agent", ""),
                    },
                )
            finally:
                # always reset the contextvar
                request_id_ctx.reset(token)
