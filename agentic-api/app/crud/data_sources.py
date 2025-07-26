# app/api/routes/data_sources.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.models.data_source import DataSource
from app.schemas.data_source import DataSourceCreate, DataSourceUpdate, DataSourceRead
from app.db.session import get_db
from app.api.dependencies import admin_required
from app.audit import log_action  # See Audit section below

router = APIRouter()

@router.get("/", response_model=List[DataSourceRead])
def list_data_sources(db: Session = Depends(get_db), admin=Depends(admin_required)):
    return db.query(DataSource).all()

@router.post("/", response_model=DataSourceRead, status_code=201)
def create_data_source(
    source: DataSourceCreate, db: Session = Depends(get_db), admin=Depends(admin_required)
):
    if db.query(DataSource).filter(DataSource.name == source.name).first():
        raise HTTPException(400, "DataSource with this name exists.")
    ds = DataSource(**source.dict(), created_by=admin.email)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    log_action(db, admin.id, f"Created data source {ds.name}")
    return ds

@router.patch("/{ds_id}", response_model=DataSourceRead)
def update_data_source(
    ds_id: int, update: DataSourceUpdate, db: Session = Depends(get_db), admin=Depends(admin_required)
):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(404, "Not found")
    for key, value in update.dict(exclude_unset=True).items():
        setattr(ds, key, value)
    db.commit()
    db.refresh(ds)
    log_action(db, admin.id, f"Updated data source {ds.name}")
    return ds

@router.delete("/{ds_id}")
def delete_data_source(ds_id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(404, "Not found")
    db.delete(ds)
    db.commit()
    log_action(db, admin.id, f"Deleted data source {ds.name}")
    return {"ok": True}

@router.post("/{ds_id}/test")
def test_connection(ds_id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(404, "Not found")
    # TODO: Implement test logic based on ds.type
    # For demo, return success
    return {"status": "success"}
