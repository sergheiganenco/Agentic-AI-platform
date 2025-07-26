# app/models/scan_job.py

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, String
from app.db.base import Base
from datetime import datetime

class ScanJob(Base):
    __tablename__ = "scan_jobs"
    id = Column(Integer, primary_key=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"))
    db_names = Column(Text)
    artifact_types = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer)
    log_id = Column(Integer, nullable=True)
    scheduled_time = Column(DateTime, nullable=True)
    scheduled_cron = Column(String, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    metadata_result_id = Column(String, nullable=True)

class ScanJobResult(Base):
    __tablename__ = "scan_job_results"
    id = Column(Integer, primary_key=True)
    scan_job_id = Column(Integer, ForeignKey("scan_jobs.id"))
    metadata_json = Column(Text, nullable=False)  # store metadata as JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
