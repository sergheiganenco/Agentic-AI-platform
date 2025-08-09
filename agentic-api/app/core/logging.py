# app/core/logging.py
import json
import logging
from app.middleware.observability import request_id_ctx

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        rid = getattr(record, "request_id", None) or request_id_ctx.get("-")
        if rid and rid != "-":
            payload["request_id"] = rid
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload)

def setup_logging(level: str | int = None) -> None:
    level = level or "INFO"
    root = logging.getLogger()
    # reset handlers to avoid duplicates on reload
    for h in list(root.handlers):
        root.removeHandler(h)
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)
    root.setLevel(level)
