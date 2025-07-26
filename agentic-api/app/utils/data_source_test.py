# data_source_test.py
from app.utils.ds_normalize import normalize_type

def normalize_type(ds_type: str) -> str:
    """
    Maps various data source aliases to canonical types (keep in sync with data_source_scan.py).
    """
    t = ds_type.strip().lower().replace(" ", "").replace("-", "")
    if t in {"azure", "azuresql", "azuresqldb", "azuredb", "azuremssql", "azure-sql", "sqlserver", "mssql", "microsoftsql"}:
        return "sqlserver"
    if t in {"postgres", "postgresql", "pg"}:
        return "postgresql"
    if t in {"mongo", "mongodb"}:
        return "mongodb"
    if t in {"mysql"}:
        return "mysql"
    if t in {"sqlite"}:
        return "sqlite"
    if t in {"csv"}:
        return "csv"
    if t in {"excel", "xlsx", "xls"}:
        return "excel"
    if t in {"file"}:
        return "file"
    return t

def test_sqlite_connection(connection_string: str):
    from sqlalchemy import create_engine, text
    try:
        engine = create_engine(connection_string)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as e:
        raise Exception(f"SQLite test failed: {e}")

def test_sql_connection(connection_string: str):
    from sqlalchemy import create_engine, text
    try:
        engine = create_engine(connection_string)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as e:
        raise Exception(f"SQL test failed: {e}")

def test_mysql_connection(connection_string: str):
    return test_sql_connection(connection_string)

def test_mssql_connection(connection_string: str):
    return test_sql_connection(connection_string)

def test_mongo_connection(connection_string: str):
    from pymongo import MongoClient
    try:
        client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        client.server_info()
        return "ok"
    except Exception as e:
        raise Exception(f"MongoDB test failed: {e}")

def test_s3_connection(connection_string: str) -> str:
    raise NotImplementedError("S3 test not implemented yet")

def test_rest_api_connection(connection_string: str) -> str:
    raise NotImplementedError("REST API test not implemented yet")


def test_data_source_by_type(ds_type: str, connection_string: str):
    norm_type = normalize_type(ds_type)
    print(f"Raw ds_type: {ds_type}, Normalized: {norm_type}")
    if norm_type == "postgresql":
        return test_sql_connection(connection_string)
    elif norm_type == "mysql":
        return test_mysql_connection(connection_string)
    elif norm_type == "sqlite":
        return test_sqlite_connection(connection_string)
    elif norm_type == "sqlserver":
        return test_mssql_connection(connection_string)
    elif norm_type == "mongodb":
        return test_mongo_connection(connection_string)
    else:
        raise Exception(f"Unknown data source type: {ds_type} (normalized: {norm_type})")

