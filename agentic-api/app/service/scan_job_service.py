import json
import traceback
from app.models.scan_job import ScanJobResult

def store_scan_metadata(db, scan_job_id, metadata_dict):
    try:
        print(f"[DEBUG] store_scan_metadata called with job_id={scan_job_id}")
        # Validate the metadata_dict (optionally, log its keys for inspection)
        if not isinstance(metadata_dict, dict):
            raise ValueError(f"metadata_dict must be a dict, got {type(metadata_dict)}")
        print(f"[DEBUG] metadata_dict keys: {list(metadata_dict.keys())}")

        # Insert result
        result = ScanJobResult(
            scan_job_id=scan_job_id,
            metadata_json=json.dumps(metadata_dict)
        )
        db.add(result)
        db.flush()   # Ensures ID is available before commit
        print(f"[DEBUG] After flush: ScanJobResult id={result.id}")
        db.commit()
        db.refresh(result)
        print(f"[INFO] Scan metadata stored in DB for job_id={scan_job_id}, result_id={result.id}")
        return result

    except Exception as e:
        print(f"[ERROR] Failed to store scan metadata for job_id={scan_job_id}: {e}")
        traceback.print_exc()
        db.rollback()
        return None
