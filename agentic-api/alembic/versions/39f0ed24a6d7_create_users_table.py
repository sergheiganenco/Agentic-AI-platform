"""Create users table

Revision ID: 39f0ed24a6d7
Revises: 184cd2020bd7
Create Date: 2025-06-27 23:23:53.963788

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '39f0ed24a6d7'
down_revision: Union[str, Sequence[str], None] = '184cd2020bd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
