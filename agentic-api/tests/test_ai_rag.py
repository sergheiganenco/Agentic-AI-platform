from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rag_index_and_query_smoke():
    idx = {
        "items":[
            {"object_type":"policy","object_id":"mask_email_v1","title":"Mask email",
             "chunk":"Emails must be masked in non-prod; use reversible tokenization.",
             "metadata":{}, "tenant_id":"demo-tenant"}
        ]
    }
    r = client.post("/ai/rag/index", json=idx)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["indexed"] >= 1

    q = client.post("/ai/rag/query", json={"question":"What policy applies to email columns?"})
    assert q.status_code == 200, q.text
    res = q.json()
    assert "answer" in res and "sources" in res
