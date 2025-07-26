"""Initial schema

Revision ID: 184cd2020bd7
Revises: e83b70c323c1
Create Date: 2025-06-27 22:49:03.834664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '184cd2020bd7'
down_revision: Union[str, Sequence[str], None] = 'e83b70c323c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
