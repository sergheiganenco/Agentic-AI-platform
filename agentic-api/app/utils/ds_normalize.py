# app/utils/ds_normalize.py

def normalize_type(type_name: str) -> str:
    """
    Normalize various data source type strings to canonical values.
    """
    mapping = {
        "azure": "sqlserver",
        "azuresql": "sqlserver",
        "azuremssql": "sqlserver",
        "mssql": "sqlserver",
        "sqlserver": "sqlserver",
        "postgres": "postgresql",
        "postgresql": "postgresql",
        "mysql": "mysql",
        "sqlite": "sqlite",
        "mongodb": "mongodb",
        "mongo": "mongodb"
    }
    return mapping.get(type_name.strip().lower().replace(" ", "").replace("-", ""), type_name.strip().lower())
