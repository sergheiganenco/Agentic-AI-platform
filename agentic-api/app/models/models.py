# models.py

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY
from base import Base

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    type = Column(String)  # e.g. "sqlserver", "postgres", "azure"
    host = Column(String)
    port = Column(Integer)
    encrypted_credentials = Column(String)  # Store securely!
    created_by = Column(Integer, ForeignKey("users.id"))
    environment = Column(String)  # e.g. "prod", "dev"
    tags = Column(ARRAY(String))
    active = Column(Boolean, default=True)

class ScanJob(Base):
    __tablename__ = "scan_jobs"
    id = Column(Integer, primary_key=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"))
    db_names = Column(ARRAY(String))
    artifact_types = Column(ARRAY(String))
    status = Column(String, default="pending")
    created_at = Column(DateTime)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    scheduled_time = Column(DateTime, nullable=True)
    scheduled_cron = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    error_message = Column(String, nullable=True)
    metadata_result_id = Column(String, nullable=True)  # Reference to Mongo
    log_id = Column(Integer, ForeignKey("audit_logs.id"))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    object_type = Column(String)
    object_id = Column(Integer)
    timestamp = Column(DateTime)
    details = Column(JSON)
