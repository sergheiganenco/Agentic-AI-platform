from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from dateutil import parser as dateutil_parser  # pip install python-dateutil
import json

from app.db.session import get_db
from app.models import DataSource, ScanJob, AuditLog
from app.celery_config import celery_app
from app.api.dependencies import get_current_user

router = APIRouter()

# --- Request model ---
class ScanRequest(BaseModel):
    data_source_id: int = Field(..., alias="dataSourceId")
    db_names: List[str] = Field(..., alias="dbNames")
    artifact_types: List[str] = Field(..., alias="artifactTypes")
    scheduled_time: Optional[str] = Field(None, alias="scheduledTime")
    scheduled_cron: Optional[str] = Field(None, alias="scheduledCron")

    class Config:
        allow_population_by_field_name = True

@router.post("/scan", status_code=202)
def start_scan(
    req: ScanRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # 1. RBAC: Check user has access to DataSource
    ds = db.query(DataSource).filter_by(id=req.data_source_id, is_active=True).first()
    if not ds:
        raise HTTPException(404, "Data source not found or inactive")

    # 2. Optionally: Validate DBs/artifacts against enumerated list
    # TODO: Implement enumerate_databases and enumerate_artifacts if needed

    # 3. Parse scheduled_time as datetime, if provided
    parsed_scheduled_time = None
    if req.scheduled_time:
        try:
            parsed_scheduled_time = dateutil_parser.isoparse(req.scheduled_time)
        except Exception as e:
            raise HTTPException(400, f"Invalid scheduled_time: {e}")

    # 4. Audit log (serialize details as JSON string)
    audit = AuditLog(
        user_id=current_user.id,
        action="start_scan",
        object_type="data_source",
        object_id=ds.id,
        timestamp=datetime.utcnow(),
        details=json.dumps(req.dict(by_alias=True)),  # Ensure camelCase keys for UI traceability
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    # 5. Create scan job (store lists as JSON strings if columns are Text)
    job = ScanJob(
        data_source_id=ds.id,
        db_names=json.dumps(req.db_names),            # Store as JSON string
        artifact_types=json.dumps(req.artifact_types),# Store as JSON string
        status="pending",
        created_at=datetime.utcnow(),
        created_by=current_user.id,
        log_id=audit.id,
        scheduled_time=parsed_scheduled_time,
        scheduled_cron=req.scheduled_cron
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 6. Trigger Celery worker (async)
    celery_app.send_task('workers.tasks.run_scan_job', args=[job.id])


    # 7. Return jobId in camelCase for UI
    return {"jobId": str(job.id), "status": "queued"}
