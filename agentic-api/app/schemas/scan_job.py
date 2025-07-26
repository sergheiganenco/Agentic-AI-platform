from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class ScanJobOut(BaseModel):
    id: int
    data_source_id: int
    db_names: List[str]
    artifact_types: List[str]
    status: str
    created_at: datetime
    created_by: int
    log_id: Optional[int]
    scheduled_time: Optional[datetime]
    scheduled_cron: Optional[str]
    finished_at: Optional[datetime]
    metadata_result_id: Optional[str]

    class Config:
        orm_mode = True

class ScanResultOut(BaseModel):
    scan_job_id: int
    data_source: str
    scan_timestamp: str
    databases: list
