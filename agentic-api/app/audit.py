# app/audit.py
from app.models.audit import AuditLog

def log_action(db, user_id: int, action: str):
    entry = AuditLog(user_id=user_id, action=action)
    db.add(entry)
    db.commit()
