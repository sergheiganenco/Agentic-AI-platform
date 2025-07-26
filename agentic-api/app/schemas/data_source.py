# app/schemas/data_source.py
from pydantic import BaseModel
from typing import Optional

class DataSourceBase(BaseModel):
    name: str
    type: str
    connection_string: str
    is_active: Optional[bool] = True

class DataSourceCreate(DataSourceBase):
    pass

class DataSourceUpdate(BaseModel):
    name: Optional[str]
    type: Optional[str]
    connection_string: Optional[str]
    is_active: Optional[bool]

class DataSourceRead(DataSourceBase):
    id: int
    connection_status: Optional[str] = "unknown" 

class DataSourcePublic(BaseModel):
    id: int
    name: str
    type: str
    is_active: bool
    connection_status: str | None = None


class Config:
    from_attributes = True
