"""AI RAG + Policy base

Revision ID: 20250809_ai_rag_policy
Revises: create_profiling_tables_20250809
Create Date: 2025-08-09
"""
from alembic import op
import sqlalchemy as sa

revision = "20250809_ai_rag_policy"
down_revision = "create_profiling_tables_20250809"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name  # "postgresql" | "sqlite" | ...

    insp = sa.inspect(bind)

    # ----- Dialect-specific types -----
    if dialect == "postgresql":
        # Enable pgvector once; safe if already installed
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        from sqlalchemy.dialects import postgresql as pg
        JSONType = pg.JSONB
        VectorType = pg.VECTOR(dim=3072)
        now_sql = sa.text("now()")
    else:
        # SQLite (and others): fallback types
        JSONType = sa.JSON       # SQLAlchemy will emulate JSON on SQLite (as TEXT)
        VectorType = sa.LargeBinary()  # or sa.Text() if you store base64/JSON
        now_sql = sa.text("CURRENT_TIMESTAMP")

    # ----- ai_embedding -----
    if not insp.has_table("ai_embedding"):
        op.create_table(
            "ai_embedding",
            sa.Column("id", sa.Integer, primary_key=True, nullable=False),
            sa.Column("tenant_id", sa.String(length=64), nullable=True),
            sa.Column("object_type", sa.String(length=32), nullable=False),   # asset|column|profile|policy
            sa.Column("object_id", sa.String(length=256), nullable=False),
            sa.Column("title", sa.String(length=512), nullable=True),
            sa.Column("chunk", sa.Text, nullable=False),
            sa.Column("chunk_hash", sa.String(length=64), nullable=False, unique=True),
            sa.Column("vector", VectorType, nullable=True),  # nullable on non-PG
            sa.Column("metadata", JSONType, server_default=sa.text("'{}'") if dialect != "postgresql" else sa.text("'{}'::jsonb")),
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
            sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
        )

        # Vector index is Postgres + pgvector only
        if dialect == "postgresql":
            op.create_index("ix_ai_embedding_vector", "ai_embedding", ["vector"], postgresql_using="ivfflat")
        # Useful general-purpose secondary indexes
        op.create_index("ix_ai_embedding_object", "ai_embedding", ["object_type", "object_id"], unique=False)
        op.create_index("ix_ai_embedding_tenant", "ai_embedding", ["tenant_id"], unique=False)

    # ----- policy -----
    if not insp.has_table("policy"):
        op.create_table(
            "policy",
            sa.Column("id", sa.Integer, primary_key=True, nullable=False),
            sa.Column("tenant_id", sa.String(length=64), nullable=True),
            sa.Column("name", sa.String(length=256), nullable=False),
            sa.Column("type", sa.String(length=64), nullable=False),     # masking|retention|access|residency
            sa.Column("scope", JSONType, nullable=False),                # {tables:[], columns:[]}
            sa.Column("definition", JSONType, nullable=False),           # normalized policy payload
            sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'active'")),
            sa.Column("created_by", sa.String(length=128), nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
            sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
        )
        op.create_index("ix_policy_tenant", "policy", ["tenant_id"], unique=False)
        op.create_index("ix_policy_type_status", "policy", ["type", "status"], unique=False)

    # ----- policy_suggestion -----
    if not insp.has_table("policy_suggestion"):
        op.create_table(
            "policy_suggestion",
            sa.Column("id", sa.Integer, primary_key=True, nullable=False),
            sa.Column("tenant_id", sa.String(length=64), nullable=True),
            sa.Column("scan_id", sa.String(length=256), nullable=True),
            sa.Column("suggested_by", sa.String(length=128), nullable=True),
            sa.Column("policies", JSONType, nullable=False),  # list of {name,type,scope,definition,confidence}
            sa.Column("status", sa.String(length=32), server_default=sa.text("'pending'")),
            sa.Column("notes", sa.Text, nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
            sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
        )
        op.create_index("ix_policy_suggestion_tenant", "policy_suggestion", ["tenant_id"], unique=False)
        op.create_index("ix_policy_suggestion_status", "policy_suggestion", ["status"], unique=False)

    # ----- audit_log -----
    if not insp.has_table("audit_log"):
        op.create_table(
            "audit_log",
            sa.Column("id", sa.BigInteger, primary_key=True, nullable=False),
            sa.Column("tenant_id", sa.String(length=64), nullable=True),
            sa.Column("actor", sa.String(length=128), nullable=True),
            sa.Column("action", sa.String(length=64), nullable=False),   # policy.apply|ai.ask|rag.index
            sa.Column("target_type", sa.String(length=64), nullable=True),
            sa.Column("target_id", sa.String(length=256), nullable=True),
            sa.Column("request_id", sa.String(length=64), nullable=True),
            sa.Column("details", JSONType, server_default=sa.text("'{}'") if dialect != "postgresql" else sa.text("'{}'::jsonb")),
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=now_sql, nullable=False),
        )
        op.create_index("ix_audit_tenant_time", "audit_log", ["tenant_id", "created_at"], unique=False)


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name
    insp = sa.inspect(bind)

    if insp.has_table("audit_log"):
        op.drop_index("ix_audit_tenant_time", table_name="audit_log")
        op.drop_table("audit_log")

    if insp.has_table("policy_suggestion"):
        op.drop_index("ix_policy_suggestion_status", table_name="policy_suggestion")
        op.drop_index("ix_policy_suggestion_tenant", table_name="policy_suggestion")
        op.drop_table("policy_suggestion")

    if insp.has_table("policy"):
        op.drop_index("ix_policy_type_status", table_name="policy")
        op.drop_index("ix_policy_tenant", table_name="policy")
        op.drop_table("policy")

    if insp.has_table("ai_embedding"):
        # Vector index exists only on Postgres
        if dialect == "postgresql":
            op.drop_index("ix_ai_embedding_vector", table_name="ai_embedding")
        op.drop_index("ix_ai_embedding_object", table_name="ai_embedding")
        op.drop_index("ix_ai_embedding_tenant", table_name="ai_embedding")
        op.drop_table("ai_embedding")

    # Do NOT attempt to drop extension on downgrade (harmless to leave on PG)
