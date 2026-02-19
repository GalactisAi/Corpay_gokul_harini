"""add storage_url to file_uploads and slideshow file type

Revision ID: 005
Revises: 004
Create Date: 2026-02-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name
    # Add storage_url column if not exists
    if dialect == "postgresql":
        op.execute(sa.text("ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS storage_url VARCHAR(1000)"))
    else:
        try:
            op.add_column("file_uploads", sa.Column("storage_url", sa.String(1000), nullable=True))
        except Exception:
            pass  # column may already exist


def downgrade():
    op.drop_column("file_uploads", "storage_url", if_exists=True)