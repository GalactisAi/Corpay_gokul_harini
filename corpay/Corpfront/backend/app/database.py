"""
Production-safe database configuration for FastAPI + SQLAlchemy + Supabase PostgreSQL.
Fixes SSL connection closed unexpectedly after Railway idle wake-up.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import settings

# DATABASE_URL is loaded from environment (config.py loads .env and Settings.database_url)
DATABASE_URL = (settings.database_url or "").strip() or "sqlite:///./dashboard.db"


def _pg_engine(url: str):
    """PostgreSQL engine with production-safe pool and SSL for Supabase/Railway. Stops QueuePool limit errors."""
    return create_engine(
        url,
        connect_args={
            "sslmode": "require",  # Supabase requires SSL
        },
        pool_pre_ping=True,   # Test connections before use (fixes stale/closed SSL after idle)
        pool_recycle=300,
        pool_size=15,
        max_overflow=5,
        echo=False,
    )


def _sqlite_engine(url: str):
    """SQLite engine for local fallback."""
    return create_engine(
        url,
        connect_args={"check_same_thread": False},
        echo=False,
    )


if DATABASE_URL.startswith("postgresql"):
    try:
        engine = _pg_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        import warnings
        warnings.warn(
            f"Supabase/Postgres connection failed ({e!r}). "
            "Using local SQLite so the server can start."
        )
        DATABASE_URL = "sqlite:///./dashboard.db"
        engine = _sqlite_engine(DATABASE_URL)
else:
    engine = _sqlite_engine(DATABASE_URL)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency: yield a DB session and safely close it after the request.
    Rollback on exception so the connection is clean when returned to the pool.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
