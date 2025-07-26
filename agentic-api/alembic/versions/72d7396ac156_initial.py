"""Initial

Revision ID: 72d7396ac156
Revises: 39f0ed24a6d7
Create Date: 2025-06-27 23:32:00.712870

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72d7396ac156'
down_revision: Union[str, Sequence[str], None] = '39f0ed24a6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
