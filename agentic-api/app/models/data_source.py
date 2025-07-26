# app/models/data_source.py
from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  # e.g., "Postgres", "MySQL", "API"
    connection_string = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, nullable=True)
    connection_status = Column(String, default="unknown") 
