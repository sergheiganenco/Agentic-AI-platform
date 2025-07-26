from typing import List, Optional
from pydantic import BaseModel

class ScanRequest(BaseModel):
    data_source_id: int
    db_names: List[str]
    artifact_types: List[str]
    scheduled_time: Optional[str]
    scheduled_cron: Optional[str]
