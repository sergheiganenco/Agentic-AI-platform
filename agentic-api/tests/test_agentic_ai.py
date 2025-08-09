# tests/test_agentic_ai.py
from __future__ import annotations

import json
import types
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.api.routes.agentic_ai import get_db
from app.utils import llm as llm_module


@pytest.fixture(scope="session")
def engine():
    # use a throwaway sqlite db on disk so multiple connections can see the same data
    eng = create_engine("sqlite:///./test_agentic_ai.db", connect_args={"check_same_thread": False})
    yield eng
    try:
        import os
        os.remove("./test_agentic_ai.db")
    except Exception:
        pass


@pytest.fixture(scope="session")
def db(engine):
    # create minimal tables (mirrors alembic migration)
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS profile_run (
            id INTEGER PRIMARY KEY,
            scan_id VARCHAR(200) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS profile_result_column (
            id INTEGER PRIMARY KEY,
            run_id INTEGER NOT NULL,
            table_name VARCHAR(256) NOT NULL,
            column_name VARCHAR(256) NOT NULL,
            data_type VARCHAR(128),
            null_percent FLOAT,
            distinct_percent FLOAT,
            is_pii INTEGER DEFAULT 0 NOT NULL,
            quality_score FLOAT,
            FOREIGN KEY(run_id) REFERENCES profile_run(id) ON DELETE CASCADE
        );
    """))

    # seed one run + some columns
    engine.execute(text("DELETE FROM profile_result_column;"))
    engine.execute(text("DELETE FROM profile_run;"))
    res = engine.execute(text("INSERT INTO profile_run (scan_id) VALUES ('demo-scan-1')"))
    run_id = res.lastrowid

    rows = [
        ("customers", "ssn", "varchar", 0.0, 99.0, 1, 0.3),
        ("sales", "credit_card", "varchar", 0.0, 99.9, 1, 0.4),
        ("sales", "customer_email", "varchar", 2.1, 95.0, 1, 0.7),
        ("customers", "age", "int", 1.2, 60.0, 0, 0.95),
    ]
    for r in rows:
        engine.execute(text("""
            INSERT INTO profile_result_column
            (run_id, table_name, column_name, data_type, null_percent, distinct_percent, is_pii, quality_score)
            VALUES (:run_id, :t, :c, :dt, :np, :dp, :pii, :qs)
        """), {"run_id": run_id, "t": r[0], "c": r[1], "dt": r[2], "np": r[3], "dp": r[4], "pii": r[5], "qs": r[6]})

    yield engine


@pytest.fixture(autouse=True)
def override_db(engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def _get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_llm(monkeypatch):
    async def fake_ask_llm(messages, max_tokens=700, timeout=25.0):
        # Return a deterministic response for tests
        return {"ok": True, "answer": "TEST_ANSWER"}
    monkeypatch.setattr(llm_module, "ask_llm", fake_ask_llm)
    monkeypatch.setattr(llm_module, "LLM_ENABLED", True, raising=False)


@pytest.fixture
def client():
    return TestClient(app)


def _auth_headers():
    # We only require presence of a bearer token (route validates presence, not content)
    return {"Authorization": "Bearer test-token"}


def test_happy_path(client):
    payload = {
        "question": "What risky columns did the last scan find?",
        "scan_id": "demo-scan-1",
        "scope_tables": ["sales", "customers"],
        "row_limit": 50
    }
    r = client.post("/agentic-ai/ask", json=payload, headers=_auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["answer"] == "TEST_ANSWER"
    assert "context_summary" in data


def test_pii_only(client):
    payload = {
        "question": "Only PII",
        "scan_id": "demo-scan-1",
        "pii_only": True,
        "row_limit": 200
    }
    r = client.post("/agentic-ai/ask", json=payload, headers=_auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["answer"] == "TEST_ANSWER"


def test_missing_auth(client):
    payload = {"question": "q", "scan_id": "demo-scan-1"}
    r = client.post("/agentic-ai/ask", json=payload)  # no headers
    assert r.status_code in (401, 403)


def test_llm_error(client, monkeypatch):
    async def fail_llm(*args, **kwargs):
        return {"ok": False, "message": "down"}
    monkeypatch.setattr(llm_module, "ask_llm", fail_llm)

    payload = {"question": "q", "scan_id": "demo-scan-1"}
    r = client.post("/agentic-ai/ask", json=payload, headers=_auth_headers())
    assert r.status_code == 502
