# app/db/__init__.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./test.db"  # or your actual DB URL

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}  # for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
