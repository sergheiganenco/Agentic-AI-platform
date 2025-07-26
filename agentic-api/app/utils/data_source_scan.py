# data_source_scan.py
from app.utils.ds_normalize import normalize_type

def test_data_source_by_type(ds_type: str, connection_string: str):
    norm_type = normalize_type(ds_type)
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

def scan_data_source_metadata_by_type(
    ds_type: str,
    connection_string: str,
    db_names=None,
    artifact_types=None,
    file_path=None,
    sample_size: int = 100,
    **kwargs
):
    from app.utils.ds_normalize import normalize_type
    print(f"\n[DEBUG] RAW ds_type passed in: {ds_type!r}") 
    norm_type = normalize_type(ds_type)
    print(f"[DEBUG] NORMALIZED type: {norm_type!r}") 
    if norm_type in ["postgresql", "mysql", "sqlite", "sqlserver"]:
        return scan_sql_metadata(
            connection_string,
            db_names=db_names,
            artifact_types=artifact_types,
            **kwargs
        )
    elif norm_type == "mongodb":
        return scan_mongo_metadata(
            connection_string,
            db_names=db_names,
            artifact_types=artifact_types,
            sample_size=sample_size,
            **kwargs
        )
    elif norm_type in ["csv", "excel", "file"]:
        if not file_path:
            raise Exception("File path required for file scan")
        return scan_file_metadata(file_path, **kwargs)
    else:
        raise Exception(f"Unknown data source type: {ds_type} (normalized: {norm_type})")



def scan_sql_metadata(connection_string: str, db_names=None, artifact_types=None, **kwargs):
    from sqlalchemy import create_engine, inspect

    all_metadata = []
    dbs = db_names or [None]  # Fallback if db_names is None
    for db in dbs:
        # Construct connection string per-db, if needed
        conn_str = connection_string
        if db:  # Replace db name in conn_str; implementation depends on your format!
            conn_str = replace_db_in_conn_string(connection_string, db)
        engine = create_engine(conn_str)
        inspector = inspect(engine)

        # Extract just tables for this DB
        table_names = [
            a.split('.', 1)[-1]
            for a in (artifact_types or [])
            if (not db or a.startswith(f"{db}."))
        ]
        # If table_names is empty (user did not select anything), skip
        if not table_names:
            continue

        tables = inspector.get_table_names()
        tables = [t for t in tables if t in table_names]
        objects = []
        for table_name in tables:
            columns = inspector.get_columns(table_name)
            pk_info = inspector.get_pk_constraint(table_name)
            pk_columns = set(pk_info.get("constrained_columns", []))
            objects.append({
                "name": table_name,
                "fields": [
                    {
                        "name": col["name"],
                        "types": [str(col["type"])],
                        "nullable": col.get("nullable", True),
                        "primary_key": col["name"] in pk_columns
                    }
                    for col in columns
                ]
            })
        all_metadata.append({"db": db, "objects": objects})
    return {"source_type": "sql", "databases": all_metadata}




def scan_mongo_metadata(connection_string: str, db_names=None, artifact_types=None, sample_size=100, **kwargs):
    """
    Scans MongoDB collections and fields across multiple databases.
    """
    from pymongo import MongoClient

    client = MongoClient(connection_string)

    # If db_names not specified, fallback to default db in connection string
    if not db_names:
        db_names = []
        # Try to parse default db from connection string
        import re
        match = re.search(r"mongodb(?:\+srv)?://[^/]+/([^?]+)", connection_string)
        if match:
            db_names = [match.group(1)]
        else:
            try:
                db_names = [client.get_default_database().name]
            except Exception:
                db_names = ["test"]

    all_metadata = []
    for db_name in db_names:
        db = client[db_name]
        collections = db.list_collection_names()
        if artifact_types:
            collections = [c for c in collections if c in artifact_types]
        objects = []
        for coll_name in collections:
            field_types = {}
            docs = db[coll_name].find({}, limit=sample_size)
            found = False
            for doc in docs:
                found = True
                for k, v in doc.items():
                    t = type(v).__name__
                    field_types.setdefault(k, set()).add(t)
            fields = [
                {
                    "name": k,
                    "types": list(sorted(v)),
                    "nullable": True,
                    "primary_key": (k == "_id"),
                }
                for k, v in field_types.items()
            ]
            objects.append({"name": coll_name, "fields": fields})
            if not found:
                objects.append({"name": coll_name, "fields": []})
        all_metadata.append({"db": db_name, "objects": objects})

    return {"source_type": "mongo", "databases": all_metadata}


def scan_file_metadata(file_path: str, **kwargs):
    import pandas as pd
    ext = file_path.split('.')[-1].lower()
    if ext == "csv":
        df = pd.read_csv(file_path, nrows=200)
    elif ext in ["xlsx", "xls"]:
        df = pd.read_excel(file_path, nrows=200)
    else:
        raise Exception("Unsupported file type")
    fields = [
        {
            "name": col,
            "types": [str(df[col].dropna().map(type).mode()[0].__name__) if not df[col].dropna().empty else "unknown"],
            "nullable": df[col].isnull().any(),
            "primary_key": False,
        }
        for col in df.columns
    ]
    return {"source_type": "file", "objects": [{"name": file_path, "fields": fields}]}

