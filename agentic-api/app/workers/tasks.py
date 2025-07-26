# app/tasks.py

from app.celery_config import celery_app
from app.models.scan_job import ScanJob, ScanJobResult
from app.models.data_source import DataSource
from app.utils.data_source_scan import scan_data_source_metadata_by_type
from app.service.scan_job_service import store_scan_metadata
from app.db.session import SessionLocal
from app.config import settings
import json
import traceback

print("[CELERY WORKER STARTUP] DATABASE:", settings.database_url)

@celery_app.task(name='workers.tasks.run_scan_job')
def run_scan_job(scan_job_id: int):
    print("[TASK] Starting run_scan_job for job_id:", scan_job_id)
    db = SessionLocal()
    try:
        job = db.query(ScanJob).get(scan_job_id)
        if not job:
            print(f"[ERROR] Job {scan_job_id} not found")
            return

        print(f"[TASK] Loaded ScanJob: {job.id}, db_names={job.db_names}, artifact_types={job.artifact_types}")
        ds = db.query(DataSource).get(job.data_source_id)
        print(f"[TASK] DataSource loaded: {ds.id if ds else None}")

        db_names = json.loads(job.db_names)
        artifact_types = json.loads(job.artifact_types)
        print(f"[TASK] Scanning metadata with db_names={db_names}, artifact_types={artifact_types}")

        metadata = scan_data_source_metadata_by_type(ds.type, ds.connection_string, db_names=db_names, artifact_types=artifact_types)
        print(f"[TASK] Metadata scan complete. Storing metadata...")

        result = store_scan_metadata(db, scan_job_id, metadata)
        print(f"[TASK] Metadata stored! Result ID: {result.id if result else None}")

        job.status = "completed"
        db.commit()
        print(f"[INFO] Job {scan_job_id} completed and metadata stored")
    except Exception as e:
        print(f"[ERROR] Error in scan job: {e}")
        traceback.print_exc()
        job = db.query(ScanJob).get(scan_job_id)
        if job:
            job.status = "failed"
            db.commit()
    finally:
        db.close()
