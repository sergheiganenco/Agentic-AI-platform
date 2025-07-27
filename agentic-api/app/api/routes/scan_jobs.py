# app/api/routes/scan_jobs.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import csv
import io
from app.models import ScanJob
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.schemas.scan_job import ScanJobOut, ScanResultOut
from app.mongo_client import get_metadata_result  # You need to implement this!
from app.models.scan_job import ScanJob, ScanJobResult
from app.models.data_source import DataSource  # Assuming you have a DataSource model

router = APIRouter()

@router.get("/scan-jobs", response_model=List[ScanJobOut])
def list_scan_jobs(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    jobs = db.query(ScanJob).filter(ScanJob.created_by == current_user.id).order_by(ScanJob.created_at.desc()).all()
    results = []
    for job in jobs:
        # Convert JSON string to list for API response
        job_dict = job.__dict__.copy()
        job_dict['db_names'] = json.loads(job.db_names) if job.db_names else []
        job_dict['artifact_types'] = json.loads(job.artifact_types) if job.artifact_types else []
        # You may need to convert datetime to str if Pydantic expects str (optional)
        # job_dict['created_at'] = job.created_at.isoformat() if job.created_at else None
        results.append(job_dict)
    return results



@router.get("/scan-jobs/{job_id}/result")
def get_scan_job_result(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result = db.query(ScanJobResult).filter(ScanJobResult.scan_job_id == job_id).order_by(ScanJobResult.created_at.desc()).first()
    print(f"[DEBUG] Lookup result for scan_job_id={job_id}: {result}")
    if not result:
        raise HTTPException(404, "No result yet")
    
    # Get the ScanJob for context (data_source, etc.)
    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    data_source = db.query(DataSource).filter(DataSource.id == job.data_source_id).first() if job else None

    return {
        "scan_job_id": job_id,
        "metadata_json": result.metadata_json,
        "data_source": data_source.name if data_source else None,
        "scan_timestamp": result.created_at.isoformat(),
        "databases": [],
    }


@router.get("/scan-jobs/{job_id}/export")
def export_scan_job_csv(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    job = db.query(ScanJobResult).filter(ScanJobResult.scan_job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Not found")
    # Optional: Check job owner == current_user.id

    # Assuming job.metadata_json is the result JSON
    data = json.loads(job.metadata_json)
    # Flatten for CSV (your logic may vary)
    objects = data.get("objects") or []
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["table", "name", "type", "nullable", "primary_key", "row_count", "description"])
    for obj in objects:
        for field in obj.get("fields", []):
            writer.writerow([
                obj.get("name"),
                field.get("name"),
                ", ".join(field.get("types", [])),
                field.get("nullable"),
                field.get("primary_key"),
                field.get("row_count"),
                field.get("description"),
            ])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=scan_job_{job_id}.csv"})