from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user

router = APIRouter()

# Friendly name (shown in UI) -> value (used in backend/DB)
AVAILABLE_SOURCE_TYPES = [
    {"label": "PostgreSQL",      "value": "postgresql"},
    {"label": "MySQL",           "value": "mysql"},
    {"label": "SQL Server",      "value": "sqlserver"},
    {"label": "MongoDB",         "value": "mongodb"},
    {"label": "SQLite",          "value": "sqlite"},
    {"label": "Oracle",          "value": "oracle"},
    {"label": "Snowflake",       "value": "snowflake"},
    {"label": "BigQuery",        "value": "bigquery"},
    {"label": "Amazon S3",       "value": "s3"},
    {"label": "Azure Blob",      "value": "azureblob"},
    {"label": "Google Sheets",   "value": "googlesheets"},
    {"label": "CSV File",        "value": "csv"},
    {"label": "Excel File",      "value": "excel"},
]

@router.get("/", tags=["Source Types"])
def get_source_types(current_user=Depends(get_current_user)):
    return AVAILABLE_SOURCE_TYPES
