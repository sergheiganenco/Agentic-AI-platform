# app/utils/data_source_scan.py

from app.utils.ds_normalize import normalize_type, replace_db_in_conn_string
import logging

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
    norm_type = normalize_type(ds_type)
    print(f"\n[DEBUG] RAW ds_type passed in: {ds_type!r}") 
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
    from sqlalchemy import create_engine, inspect, text

    engine = create_engine(connection_string)
    inspector = inspect(engine)
    dialect = engine.dialect.name

    # --- SCHEMA LOGIC ---
    if dialect == "sqlite":
        schema = None
    elif dialect in ("mssql", "pyodbc"):
        schema = "dbo"
    else:
        schema = db_names[0] if db_names else None

    # Normalize artifact_types
    artifact_names = set([a.lower() for a in artifact_types]) if artifact_types else None

    objects = []

    # ----------- TABLES -----------
    table_names = []
    try:
        all_table_names = inspector.get_table_names(schema=schema)
        # Filter only requested tables
        if artifact_names:
            table_names = [t for t in all_table_names if t.lower() in artifact_names]
        else:
            table_names = all_table_names
    except Exception as e:
        print(f"[SQL Scan] Error getting table names: {e}")

    # ----------- VIEWS -----------
    view_names = []
    try:
        all_view_names = inspector.get_view_names(schema=schema)
        if artifact_names:
            view_names = [v for v in all_view_names if v.lower() in artifact_names]
        else:
            view_names = all_view_names
    except Exception as e:
        print(f"[SQL Scan] Error getting view names: {e}")

    # ----------- PROCEDURES -----------
    proc_names = []
    if dialect in ("mssql", "pyodbc"):
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("""
                        SELECT name 
                        FROM sys.objects 
                        WHERE type IN ('P', 'PC') 
                        AND schema_id = SCHEMA_ID(:schema)
                    """), {"schema": schema}
                )
                all_proc_names = [row[0] for row in result]
                if artifact_names:
                    proc_names = [p for p in all_proc_names if p.lower() in artifact_names]
                else:
                    proc_names = all_proc_names
        except Exception as e:
            print(f"[SQL Scan] Error getting procedures: {e}")

    # ----------- SCAN TABLES -----------
    for table_name in table_names:
        objects.append({
            "table": table_name,
            "name": table_name,
            "object_type": "table",
            "types": [],
            "nullable": None,
            "primary_key": None
        })
        try:
            columns = inspector.get_columns(table_name, schema=schema)
            pk_constraint = inspector.get_pk_constraint(table_name, schema=schema)
            pk_columns = set(pk_constraint.get("constrained_columns", [])) if pk_constraint else set()
            for col in columns:
                objects.append({
                    "table": table_name,
                    "name": col["name"],
                    "object_type": "table_column",
                    "types": [str(col["type"])],
                    "nullable": col.get("nullable", True),
                    "primary_key": col["name"] in pk_columns
                })
        except Exception as e:
            print(f"[SQL Scan] Error scanning table '{table_name}': {e}")

    # ----------- SCAN VIEWS -----------
    for view_name in view_names:
        objects.append({
            "table": view_name,
            "name": view_name,
            "object_type": "view",
            "types": [],
            "nullable": None,
            "primary_key": None
        })
        try:
            columns = inspector.get_columns(view_name, schema=schema)
            for col in columns:
                objects.append({
                    "table": view_name,
                    "name": col["name"],
                    "object_type": "view_column",
                    "types": [str(col["type"])],
                    "nullable": col.get("nullable", True),
                    "primary_key": False
                })
        except Exception as e:
            print(f"[SQL Scan] Error scanning view '{view_name}': {e}")

    # ----------- SCAN PROCEDURES -----------
    for proc_name in proc_names:
        objects.append({
            "table": proc_name,
            "name": proc_name,
            "object_type": "procedure",
            "types": [],
            "nullable": None,
            "primary_key": None
        })
        # Scan parameters
        try:
            with engine.connect() as conn:
                param_result = conn.execute(
                    text("""
                        SELECT p.name, t.name AS type_name, p.max_length, p.is_output
                        FROM sys.parameters p
                        INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
                        WHERE object_id = OBJECT_ID(:full_proc_name)
                    """),
                    {"full_proc_name": f"{schema}.{proc_name}"}
                )
                for param in param_result:
                    objects.append({
                        "table": proc_name,
                        "name": param.name,
                        "object_type": "procedure_param",
                        "types": [param.type_name],
                        "nullable": not param.is_output,
                        "primary_key": False
                    })
        except Exception as e:
            print(f"[SQL Scan] Error scanning procedure '{proc_name}': {e}")

    return {"source_type": "sql", "objects": objects}








def scan_mongo_metadata(connection_string, db_names=None, artifact_types=None, **kwargs):
    from pymongo import MongoClient

    db_name = None
    if isinstance(db_names, list):
        db_name = db_names[0] if db_names else None
    elif isinstance(db_names, str):
        db_name = db_names
    if not db_name:
        raise Exception("Mongo scan requires a database name (db_names)")

    client = MongoClient(connection_string)
    db = client[db_name]
    objects = []
    # List all collections, or filter if artifact_types given
    collection_names = (
        [name for name in db.list_collection_names() if not artifact_types or name in artifact_types]
    )
    for name in collection_names:
        sample_doc = db[name].find_one()
        fields = []
        if sample_doc:
            for key, value in sample_doc.items():
                fields.append({"name": key, "types": [type(value).__name__]})
        objects.append({"name": name, "object_type": "collection", "fields": fields})
    return {"source_type": "mongo", "objects": objects}


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
    return {"source_type": "file", "objects": [{"name": file_path, "fields": fields, "object_type": ext}]}
