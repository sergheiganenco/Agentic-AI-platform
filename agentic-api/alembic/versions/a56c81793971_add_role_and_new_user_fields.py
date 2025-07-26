"""Add role and new user fields

Revision ID: a56c81793971
Revises: 842d956cd681
Create Date: 2025-06-28 19:45:06.802256

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a56c81793971'
down_revision: Union[str, Sequence[str], None] = '842d956cd681'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
