"""
Production-safe database configuration for FastAPI + SQLAlchemy + Supabase PostgreSQL.
Fixes SSL connection closed unexpectedly after Railway idle wake-up.
Tuned for Supabase Pro: larger pool and overflow to avoid QueuePool limit errors.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, Query
from typing import Generator

from app.config import settings

# DATABASE_URL is loaded from environment (config.py loads .env and Settings.database_url)
DATABASE_URL = (settings.database_url or "").strip() or "sqlite:///./dashboard.db"

# Retry settings for transient SSL/connection drops (Supabase free tier)
_MAX_DB_RETRIES = 2  # max 2 retries = 3 total attempts


def _pg_engine(url: str):
    """PostgreSQL engine for Supabase Pro. Use pooler port 6543; transaction mode, small pool."""
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")
    return create_engine(
        url,
        pool_size=10,
        max_overflow=10,
        pool_timeout=10,
        pool_recycle=300,
        pool_pre_ping=True,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000",
        },
    )


def _sqlite_engine(url: str):
    """SQLite engine for local fallback."""
    return create_engine(
        url,
        connect_args={"check_same_thread": False},
        echo=False,
    )


if DATABASE_URL.startswith("postgresql"):
    engine = _pg_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
else:
    engine = _sqlite_engine(DATABASE_URL)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _is_connection_error(exc: BaseException) -> bool:
    """True if the exception is a transient connection/SSL error worth retrying."""
    if isinstance(exc, OperationalError):
        return True
    msg = (getattr(exc, "message", "") or str(exc)).lower()
    return "ssl" in msg or "connection" in msg or "closed" in msg or "reset" in msg


class _RetryingSession:
    """
    Wraps a Session and retries execute/commit on OperationalError (e.g. SSL drop).
    Max 2 retries (3 attempts total) so the app can recover without returning 500.
    """

    def __init__(self, session: Session):
        self._session = session

    def execute(self, *args, **kwargs):
        last_exc = None
        for attempt in range(_MAX_DB_RETRIES + 1):
            try:
                return self._session.execute(*args, **kwargs)
            except Exception as e:
                if not _is_connection_error(e) or attempt == _MAX_DB_RETRIES:
                    raise
                last_exc = e
                try:
                    self._session.rollback()
                except Exception:
                    pass
        if last_exc is not None:
            raise last_exc

    def commit(self):
        last_exc = None
        for attempt in range(_MAX_DB_RETRIES + 1):
            try:
                return self._session.commit()
            except Exception as e:
                if not _is_connection_error(e) or attempt == _MAX_DB_RETRIES:
                    raise
                last_exc = e
                try:
                    self._session.rollback()
                except Exception:
                    pass
        if last_exc is not None:
            raise last_exc

    def query(self, *args, **kwargs) -> Query:
        """Bind query to this wrapper so execute() (and thus retries) are used."""
        return self._session.query(*args, **kwargs).with_session(self)

    def __getattr__(self, name):
        return getattr(self._session, name)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency: yield a DB session and close it immediately after the request.
    Uses try...finally so db.close() is always called. Rollback on exception so
    the connection is clean when returned to the pool. Session is wrapped with
    retry logic for transient OperationalErrors (e.g. SSL drops).
    """
    db = SessionLocal()
    try:
        yield _RetryingSession(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
