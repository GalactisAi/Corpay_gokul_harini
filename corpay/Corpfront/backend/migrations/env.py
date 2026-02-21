# Load backend .env (same path as app/config.py) so DATABASE_URL is set before app.config is imported.
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

import time
from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app.database import Base
from app.models import *  # Import all models
target_metadata = Base.metadata

# Database URL comes only from app.config.settings (reads .env). Never from alembic.ini or a hardcoded string.
from app.config import settings


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = settings.database_url or "sqlite:///./dashboard.db"
    print(f"DEBUG: Using database URL: {settings.database_url or 'sqlite:///./dashboard.db (fallback)'}")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    Engine is created from app.config.settings.database_url only (no alembic.ini, no hardcoded URL).
    """
    url = settings.database_url or "sqlite:///./dashboard.db"
    print(f"DEBUG: Using database URL: {settings.database_url or 'sqlite:///./dashboard.db (fallback)'}")

    max_attempts = 5
    for attempt in range(1, max_attempts + 1):
        connect_args = {}
        if url.startswith("postgresql"):
            connect_args = {
                "sslmode": "require",
                "connect_timeout": 15,
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 5,
                "keepalives_count": 3,
            }
        connectable = create_engine(
            url,
            poolclass=pool.NullPool,
            connect_args=connect_args,
            execution_options={"use_native_hstore": False},
        )
        try:
            with connectable.connect() as connection:
                context.configure(connection=connection, target_metadata=target_metadata)
                with context.begin_transaction():
                    context.run_migrations()
            break
        except Exception as e:
            connectable.dispose()
            if attempt == max_attempts:
                raise
            print(f"Migration attempt {attempt} failed: {e}. Retrying in 10s...")
            time.sleep(10)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

