from sqlalchemy import text, inspect

def scan_artifact(conn, artifact_type, schema=None):
    """
    Returns artifact lists for the connected database:
      - artifact_type: 'tables', 'views', 'procedures', 'permissions'
    """
    inspector = inspect(conn)
    dialect = conn.engine.dialect.name.lower()
    results = []

    if artifact_type == "tables":
        # Universal for most DBs
        tables = inspector.get_table_names(schema=schema)
        if dialect == "sqlite":
            # No row count for SQLite in one query; just names
            results = [{"name": name} for name in tables]
        elif dialect in ("postgresql", "mysql"):
            results = [{"name": name} for name in tables]
        elif dialect in ("mssql", "sqlserver"):
            # Use your existing logic for row count (SQL Server only)
            sql = """
                SELECT t.name, SUM(p.rows) AS row_count
                FROM sys.tables t
                INNER JOIN sys.partitions p ON t.object_id=p.object_id
                WHERE p.index_id IN (0,1)
                GROUP BY t.name
            """
            res = conn.execute(text(sql))
            results = [{"name": row[0], "row_count": row[1]} for row in res]
        else:
            results = [{"name": name} for name in tables]

    elif artifact_type == "views":
        views = inspector.get_view_names(schema=schema)
        results = [{"name": name} for name in views]

    elif artifact_type == "procedures":
        # Only some DBs support this in SQLAlchemy!
        if dialect in ("mssql", "sqlserver"):
            res = conn.execute(text("SELECT name FROM sys.procedures"))
            results = [{"name": row[0]} for row in res]
        elif hasattr(inspector, "get_procedures"):
            procs = inspector.get_procedures(schema=schema)
            results = [{"name": p['name']} for p in procs]
        else:
            results = []

    elif artifact_type == "permissions":
        if dialect in ("mssql", "sqlserver"):
            sql = """
                SELECT pr.name AS principal_name, pr.type_desc AS principal_type, pe.permission_name, pe.state_desc
                FROM sys.database_permissions pe
                JOIN sys.database_principals pr ON pe.grantee_principal_id = pr.principal_id
            """
            res = conn.execute(text(sql))
            results = [
                {
                    "principal": row[0],
                    "type": row[1],
                    "permission": row[2],
                    "state": row[3],
                }
                for row in res
            ]
        else:
            results = []  # Not implemented for other DBs

    else:
        raise NotImplementedError(f"Unsupported artifact type: {artifact_type}")

    return results

def scan_artifact_mongo(connection_string, db, artifact_type):
    if not db:
        raise ValueError("Database name (`db`) is required for MongoDB artifact scan.")
    if artifact_type != "collections":
        raise ValueError(f"Only 'collections' is supported for MongoDB (got '{artifact_type}').")
    from pymongo import MongoClient
    client = MongoClient(connection_string)
    if db not in client.list_database_names():
        raise ValueError(f"Database '{db}' does not exist in this MongoDB source.")
    return client[db].list_collection_names()


def list_tables(conn):
    sql = """
        SELECT t.name, SUM(p.rows) AS row_count
        FROM sys.tables t
        INNER JOIN sys.partitions p ON t.object_id=p.object_id
        WHERE p.index_id IN (0,1)
        GROUP BY t.name
    """
    result = conn.execute(text(sql))  # <--- FIX: wrap with text()
    return [{"name": row[0], "row_count": row[1]} for row in result]

def list_views(conn):
    result = conn.execute(text("SELECT name FROM sys.views"))
    return [{"name": row[0]} for row in result]

def list_procedures(conn):
    result = conn.execute(text("SELECT name FROM sys.procedures"))
    return [{"name": row[0]} for row in result]

def get_permissions(conn):
    sql = """
        SELECT pr.name AS principal_name, pr.type_desc AS principal_type, pe.permission_name, pe.state_desc
        FROM sys.database_permissions pe
        JOIN sys.database_principals pr ON pe.grantee_principal_id = pr.principal_id
    """
    result = conn.execute(text(sql))
    return [
        {
            "principal": row[0],
            "type": row[1],
            "permission": row[2],
            "state": row[3],
        }
        for row in result
    ]
