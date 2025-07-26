"""Add role and new user fields

Revision ID: 842d956cd681
Revises: 9c8cf7f11f43
Create Date: 2025-06-28 19:43:27.982062

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '842d956cd681'
down_revision: Union[str, Sequence[str], None] = '9c8cf7f11f43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
