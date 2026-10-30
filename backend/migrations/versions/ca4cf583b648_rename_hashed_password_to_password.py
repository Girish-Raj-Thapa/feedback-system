"""rename_hashed_password_to_password

Revision ID: ca4cf583b648
Revises: 8e3324dabe41
Create Date: 2026-10-13 16:24:27.774421

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ca4cf583b648"
down_revision: str | Sequence[str] | None = "8e3324dabe41"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("users", "hashed_password", new_column_name="password")


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("users", "password", new_column_name="hashed_password")
