# app/scripts/seed_demo_profiles.py
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()  # <-- add this

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("database_url")
if not DATABASE_URL:
    raise SystemExit("Set DATABASE_URL (or database_url) in your .env")

engine = create_engine(DATABASE_URL, future=True)

schema_sql = """
CREATE TABLE IF NOT EXISTS profile_run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profile_result_column (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_type TEXT,
  null_percent REAL,
  distinct_percent REAL,
  is_pii INTEGER,
  quality_score REAL,
  FOREIGN KEY(run_id) REFERENCES profile_run(id)
);
"""

seed_sql = "INSERT INTO profile_run (scan_id) VALUES (:scan_id);"

seed_cols_sql = """
INSERT INTO profile_result_column
(run_id, table_name, column_name, data_type, null_percent, distinct_percent, is_pii, quality_score)
VALUES
(:run_id, 'sales', 'customer_email', 'TEXT', 2.1, 95.0, 1, 0.7),
(:run_id, 'sales', 'credit_card',    'TEXT', 0.0, 99.9, 1, 0.4),
(:run_id, 'customers', 'ssn',        'TEXT', 0.0, 99.0, 1, 0.3),
(:run_id, 'customers', 'age',        'INTEGER', 1.5, 45.0, 0, 0.9);
"""

with engine.begin() as conn:
    for stmt in schema_sql.strip().split(";\n"):
        if stmt.strip():
            conn.execute(text(stmt))
    res = conn.execute(text(seed_sql), {"scan_id": "demo-scan-1"})
    run_id = res.lastrowid
    conn.execute(text(seed_cols_sql), {"run_id": run_id})

print("Seeded demo-scan-1 into profiling tables.")
