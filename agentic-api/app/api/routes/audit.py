# app/api/routes/audit.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.db.session import get_db
from app.api.dependencies import admin_required
from typing import List

router = APIRouter()

@router.get("/", response_model=List[dict])
def list_audit_logs(db: Session = Depends(get_db), admin=Depends(admin_required)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
