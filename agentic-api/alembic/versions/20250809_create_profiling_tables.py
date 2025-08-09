"""create profiling tables

Revision ID: create_profiling_tables_20250809
Revises: a56c81793971
Create Date: 2025-08-09
"""
from alembic import op
import sqlalchemy as sa

revision = "create_profiling_tables_20250809"
down_revision = "a56c81793971"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("profile_run"):
        op.create_table(
            "profile_run",
            sa.Column("id", sa.Integer, primary_key=True, nullable=False),
            sa.Column("scan_id", sa.String(length=200), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=False),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
        )
        op.create_index("ix_pr_run_scan", "profile_run", ["scan_id"], unique=False)

    if not insp.has_table("profile_result_column"):
        op.create_table(
            "profile_result_column",
            sa.Column("id", sa.Integer, primary_key=True, nullable=False),
            sa.Column("run_id", sa.Integer, sa.ForeignKey("profile_run.id", ondelete="CASCADE"), nullable=False),
            sa.Column("table_name", sa.String(length=256), nullable=False),
            sa.Column("column_name", sa.String(length=256), nullable=False),
            sa.Column("data_type", sa.String(length=128), nullable=True),
            sa.Column("null_percent", sa.Float, nullable=True),
            sa.Column("distinct_percent", sa.Float, nullable=True),
            sa.Column("is_pii", sa.Integer, nullable=False, server_default="0"),
            sa.Column("quality_score", sa.Float, nullable=True),
        )
        op.create_index("ix_prc_run_table", "profile_result_column", ["run_id", "table_name"], unique=False)
        op.create_index("ix_prc_table_col", "profile_result_column", ["table_name", "column_name"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if insp.has_table("profile_result_column"):
        op.drop_index("ix_prc_table_col", table_name="profile_result_column")
        op.drop_index("ix_prc_run_table", table_name="profile_result_column")
        op.drop_table("profile_result_column")

    if insp.has_table("profile_run"):
        op.drop_index("ix_pr_run_scan", table_name="profile_run")
        op.drop_table("profile_run")
