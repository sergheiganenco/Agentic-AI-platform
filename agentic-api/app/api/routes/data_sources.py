# app/api/routes/data_sources.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.data_source_scan import scan_data_source_metadata_by_type
from app.utils.ds_normalize import normalize_type
from app.utils.artifact_scan import scan_artifact_mongo


import logging


from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import create_engine, text

from app.db.session import get_db
from app.models.data_source import DataSource
from app.schemas.data_source import DataSourceRead, DataSourceCreate, DataSourceUpdate
from app.api.dependencies import admin_required
from app.utils.data_source_test import test_data_source_by_type
from app.schemas.data_source import DataSourcePublic
from app.utils.artifact_scan import scan_artifact
import logging

router = APIRouter()
public_router = APIRouter()

@router.get(
    "/",
    response_model=List[DataSourceRead],
    dependencies=[Depends(admin_required)]
)
def list_data_sources(db: Session = Depends(get_db)):
    """List all configured data sources."""
    return db.query(DataSource).all()

@router.post(
    "/",
    response_model=DataSourceRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_required)]
)
def create_data_source(
    source: DataSourceCreate,
    db: Session = Depends(get_db)
):
    """Create a new data source."""
    if db.query(DataSource).filter(DataSource.name == source.name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data source already exists."
        )
    ds = DataSource(**source.dict())
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds

@router.patch(
    "/{ds_id}",
    response_model=DataSourceRead,
    dependencies=[Depends(admin_required)]
)
def update_data_source(
    ds_id: int,
    update: DataSourceUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing data source."""
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found."
        )
    for key, value in update.dict(exclude_unset=True).items():
        setattr(ds, key, value)
    db.commit()
    db.refresh(ds)
    return ds

@router.delete(
    "/{ds_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(admin_required)]
)
def delete_data_source(
    ds_id: int,
    db: Session = Depends(get_db)
):
    """Delete a data source."""
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found."
        )
    db.delete(ds)
    db.commit()
    return None

@router.post("/{ds_id}/test-connection", status_code=200, dependencies=[Depends(admin_required)])
def test_data_source_connection(ds_id: int, db: Session = Depends(get_db)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found.")
    try:
        status = test_data_source_by_type(ds.type, ds.connection_string)
        ds.connection_status = status  # Update in DB
        db.commit()
        return {"detail": "ok" if status == "ok" else "error"}
    except Exception as e:
        ds.connection_status = "error"
        db.commit()
        logging.exception("Connection test failed")
        raise HTTPException(400, f"Connection failed: {e}")


@router.post("/{ds_id}/scan", status_code=200, dependencies=[Depends(admin_required)])
def scan_data_source_metadata(ds_id: int, db: Session = Depends(get_db)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found.")
    try:
        result = scan_data_source_metadata_by_type(ds.type, ds.connection_string)
        return {"metadata": result}
    except Exception as e:
        logging.exception("Scan failed")
        raise HTTPException(400, f"Scan failed: {e}")

@public_router.get(
    "/api/data-sources",
    response_model=List[DataSourcePublic],
    tags=["public"]
)
def list_active_data_sources(db: Session = Depends(get_db)):
    """
    List all active data sources (for all users, multi-tenant).
    """
    return db.query(DataSource).filter(DataSource.is_active == True).all()




@public_router.get(
    "/api/data-sources/{ds_id}/databases",
    tags=["public"]
)
def get_databases_for_source(
    ds_id: int,
    db: Session = Depends(get_db)
):
    """
    List available schemas/databases for a given data source (id).
    Supports Azure SQL, MSSQL, Postgres, MySQL, SQLite, and MongoDB.
    """
    print(f"get_databases_for_source called with ds_id={ds_id}")
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        print("Data source not found.")
        raise HTTPException(404, "Data source not found.")

    norm_type = ds.type.lower().replace(" ", "").replace("-", "")
    print(f"ds.type: {ds.type}, norm_type: {norm_type}")
    print(f"Connection string: {ds.connection_string}")

    try:
        if norm_type in ("azure", "azuresql", "azuremssql", "mssql", "sqlserver"):
            from sqlalchemy.engine.url import make_url
            url = make_url(ds.connection_string)
            dbname = url.database if url.database else "default"
            print("Matched Azure/MSSQL branch! Returning:", dbname)
            return [{"name": dbname}]

        elif norm_type in ("postgres", "postgresql", "mysql", "sqlite"):
            print("Matched Postgres/MySQL/SQLite branch!")
            from sqlalchemy import create_engine, inspect
            engine = create_engine(ds.connection_string)
            inspector = inspect(engine)
            db_names = inspector.get_schema_names()
            print("Schemas found:", db_names)
            return [{"name": name} for name in db_names]

        elif norm_type in ("mongodb", "mongo"):
            from pymongo import MongoClient
            client = MongoClient(ds.connection_string)
            db_names = client.list_database_names()
            return [{"name": name} for name in db_names]


        else:
            print("No match! norm_type:", norm_type)
            raise HTTPException(400, f"Unsupported data source type: {norm_type}")

    except Exception as e:
        print(f"Exception thrown in get_databases_for_source: {e}")
        raise HTTPException(400, f"Could not list databases/schemas: {e}")


@public_router.get(
    "/api/data-sources/{ds_id}/artifacts",
    tags=["public"]
)
def get_artifacts_for_database(
    ds_id: int,
    db: str = Query(None, description="Schema/database name (ignored for SQLite, required for Mongo)"),
    artifact_type: str = Query("tables", description="Artifact type(s), e.g. tables,views,procedures,functions,collections"),
    db_session: Session = Depends(get_db)
):
    """
    List artifacts (tables/views/procedures/collections) for a given schema/database.
    Handles multiple comma-separated artifact types, returns all in one response.
    """
    ds = db_session.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found.")

    norm_type = normalize_type(ds.type)
    types = [t.strip() for t in artifact_type.split(",") if t.strip()]
    results = {}

    try:
        if norm_type in ("mongodb", "mongo"):
            if not db:
                raise HTTPException(400, "Database name (`db`) is required for MongoDB artifact scan.")
            from pymongo import MongoClient
            client = MongoClient(ds.connection_string)
            if db not in client.list_database_names():
                raise HTTPException(400, f"Database '{db}' does not exist in this MongoDB source.")
            if "collections" in types:
                results["collections"] = client[db].list_collection_names()
            # MongoDB supports only collections, skip the rest
            for t in types:
                if t != "collections":
                    results[t] = []
            return results

        # SQL Databases (SQL Server, Postgres, MySQL, SQLite, etc.)
        from sqlalchemy import create_engine
        engine = create_engine(ds.connection_string)
        with engine.connect() as conn:
            for t in types:
                try:
                    if norm_type in ("postgresql", "mysql") and t != "tables":
                        # Use db/schema parameter for non-default types
                        artifact_results = scan_artifact(conn, t, schema=db) if db else []
                    else:
                        artifact_results = scan_artifact(conn, t)
                except NotImplementedError:
                    artifact_results = []
                except Exception as ex:
                    logging.warning(f"Failed to scan {t}: {ex}")
                    artifact_results = []
                results[t] = artifact_results
        return results

    except Exception as e:
        logging.exception(f"Exception in get_artifacts_for_database: {e}")
        raise HTTPException(400, f"Could not fetch artifacts: {e}")





    except Exception as e:
        logging.exception(f"Exception in get_artifacts_for_database: {e}")
        raise