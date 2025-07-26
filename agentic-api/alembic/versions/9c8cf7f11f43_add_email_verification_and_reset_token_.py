"""Add email verification and reset token fields to User

Revision ID: 9c8cf7f11f43
Revises: 72d7396ac156
Create Date: 2025-06-28 19:34:34.861123

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c8cf7f11f43'
down_revision: Union[str, Sequence[str], None] = '72d7396ac156'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
