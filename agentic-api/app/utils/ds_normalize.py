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

import re

# app/utils/ds_normalize.py

def replace_db_in_conn_string(conn_str: str, db_name: str, db_type: str = "") -> str:
    """
    Replace the database name in a SQL connection string.
    For SQLite, DO NOT replace the db_name (file path).
    """
    # Detect sqlite (by connection string or explicit db_type)
    if "sqlite:///" in conn_str or db_type == "sqlite":
        return conn_str  # Never swap file path for SQLite

    # SQL Server: Database= or Initial Catalog=
    import re
    conn_str = re.sub(r"(Database|Initial Catalog)=([^;]+)", f"Database={db_name}", conn_str, flags=re.IGNORECASE)
    # PostgreSQL: dbname=
    conn_str = re.sub(r"(dbname)=([^ ]+)", f"dbname={db_name}", conn_str, flags=re.IGNORECASE)
    # MySQL: database=
    conn_str = re.sub(r"(database)=([^;]+)", f"database={db_name}", conn_str, flags=re.IGNORECASE)

    return conn_str

