# app/models/audit_log.py

from sqlalchemy import Column, Integer, String, DateTime, Text
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    object_type = Column(String, nullable=False)
    object_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    details = Column(Text, nullable=True)  # This will store JSON as text
