"""ensure api_configs table exists (persistent file uploads: slideshow, revenue)

Revision ID: 004
Revises: 003
Create Date: 2026-02-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name
    if dialect == "postgresql":
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS api_configs (
                id SERIAL PRIMARY KEY,
                config_key VARCHAR(100) NOT NULL,
                config_value TEXT,
                description VARCHAR(255),
                is_active INTEGER DEFAULT 1,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_by VARCHAR(100)
            )
        """))
        conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_api_configs_config_key ON api_configs (config_key)"))
    else:
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS api_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key VARCHAR(100) NOT NULL,
                config_value TEXT,
                description VARCHAR(255),
                is_active INTEGER DEFAULT 1,
                updated_at DATETIME,
                updated_by VARCHAR(100)
            )
        """))
        conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_api_configs_config_key ON api_configs (config_key)"))


def downgrade():
    op.drop_index("ix_api_configs_config_key", table_name="api_configs", if_exists=True)
    op.drop_table("api_configs", if_exists=True)
