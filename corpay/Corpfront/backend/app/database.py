"""
Production-safe database configuration for FastAPI + SQLAlchemy + Supabase PostgreSQL.
Fixes SSL connection drops and PendingRollbackError on Railway/Supabase by:
- Wrapping ORM Query terminal methods with retry logic (_RetryingQuery)
- Wrapping Session execute/commit and query() with retry + rollback/expire_all (_RetryingSession)
- Invalidating bad connections on handle_error (engine event)
- Longer pool_recycle for Supabase idle drops.
"""
from sqlalchemy import create_engine, text, event
from sqlalchemy.exc import OperationalError, PendingRollbackError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, Query
from typing import Generator, Any

from app.config import settings

# DATABASE_URL is loaded from environment (config.py loads .env and Settings.database_url)
DATABASE_URL = (settings.database_url or "").strip() or "sqlite:///./dashboard.db"

# Retry settings: 3 retries = 4 total attempts
_MAX_DB_RETRIES = 3


def _is_retryable(exc: BaseException) -> bool:
    """True if the exception is transient and worth retrying (SSL/connection/pending rollback)."""
    if isinstance(exc, (OperationalError, PendingRollbackError)):
        return True
    msg = (getattr(exc, "message", "") or str(exc)).lower()
    keywords = (
        "ssl",
        "connection",
        "closed",
        "reset",
        "pending rollback",
        "server closed",
        "broken pipe",
    )
    return any(k in msg for k in keywords)


def _pg_engine(url: str):
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return create_engine(
        url,
        pool_size=5,          # reduced
        max_overflow=5,       # reduced
        pool_timeout=10,
        pool_recycle=300,
        pool_pre_ping=True,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000",
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 5,
            "keepalives_count": 3,
            "application_name": "corpay_dashboard",
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
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"WARNING: Startup DB connectivity check failed: {e}")
        print("App will continue - pool will reconnect on first request")
else:
    engine = _sqlite_engine(DATABASE_URL)


def _invalidate_on_connection_error(ctx: Any) -> None:
    """On SSL/connection errors, invalidate the connection so the pool discards it."""
    exc = getattr(ctx, "original_exception", None) or getattr(ctx, "sqlalchemy_exception", None)
    if exc is None:
        return
    if not _is_retryable(exc):
        return
    conn = getattr(ctx, "connection", None)
    if conn is not None and hasattr(conn, "invalidate"):
        try:
            conn.invalidate()
        except Exception:
            pass


if DATABASE_URL.startswith("postgresql"):
    event.listen(engine, "handle_error", _invalidate_on_connection_error)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class _RetryingQuery:
    """
    Wraps a SQLAlchemy Query so every terminal method (first, all, one, etc.) retries
    on OperationalError / PendingRollbackError. Chaining methods return a new _RetryingQuery.
    """

    def __init__(self, query: Query, raw_session: Session):
        self._query = query
        self._raw_session = raw_session

    def _retry(self, fn, *args, **kwargs):
        last_exc = None
        for attempt in range(_MAX_DB_RETRIES + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                if not _is_retryable(e) or attempt == _MAX_DB_RETRIES:
                    raise
                last_exc = e
                try:
                    self._raw_session.rollback()
                    self._raw_session.expire_all()
                except Exception:
                    pass
        if last_exc is not None:
            raise last_exc

    def first(self):
        return self._retry(self._query.first)

    def all(self):
        return self._retry(self._query.all)

    def one(self):
        return self._retry(self._query.one)

    def one_or_none(self):
        return self._retry(self._query.one_or_none)

    def count(self):
        return self._retry(self._query.count)

    def scalar(self):
        return self._retry(self._query.scalar)

    def filter(self, *args, **kwargs):
        return _RetryingQuery(self._query.filter(*args, **kwargs), self._raw_session)

    def filter_by(self, **kwargs):
        return _RetryingQuery(self._query.filter_by(**kwargs), self._raw_session)

    def order_by(self, *args, **kwargs):
        return _RetryingQuery(self._query.order_by(*args, **kwargs), self._raw_session)

    def limit(self, limit):
        return _RetryingQuery(self._query.limit(limit), self._raw_session)

    def offset(self, offset):
        return _RetryingQuery(self._query.offset(offset), self._raw_session)

    def join(self, *args, **kwargs):
        return _RetryingQuery(self._query.join(*args, **kwargs), self._raw_session)

    def outerjoin(self, *args, **kwargs):
        return _RetryingQuery(self._query.outerjoin(*args, **kwargs), self._raw_session)

    def with_entities(self, *args, **kwargs):
        return _RetryingQuery(self._query.with_entities(*args, **kwargs), self._raw_session)

    def distinct(self, *args, **kwargs):
        return _RetryingQuery(self._query.distinct(*args, **kwargs), self._raw_session)

    def group_by(self, *args, **kwargs):
        return _RetryingQuery(self._query.group_by(*args, **kwargs), self._raw_session)

    def having(self, *args, **kwargs):
        return _RetryingQuery(self._query.having(*args, **kwargs), self._raw_session)

    def options(self, *args, **kwargs):
        return _RetryingQuery(self._query.options(*args, **kwargs), self._raw_session)

    def __getattr__(self, name):
        return getattr(self._query, name)


class _RetryingSession:
    """
    Wraps a Session: execute() and commit() retry on OperationalError/PendingRollbackError
    with rollback+expire_all between attempts. query() returns _RetryingQuery so ORM
    db.query(Model).filter(...).first() is fully retried.
    """

    def __init__(self, session: Session):
        self._session = session

    def execute(self, *args, **kwargs):
        last_exc = None
        for attempt in range(_MAX_DB_RETRIES + 1):
            try:
                return self._session.execute(*args, **kwargs)
            except Exception as e:
                if not _is_retryable(e) or attempt == _MAX_DB_RETRIES:
                    raise
                last_exc = e
                try:
                    self._session.rollback()
                    self._session.expire_all()
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
                if not _is_retryable(e) or attempt == _MAX_DB_RETRIES:
                    raise
                last_exc = e
                try:
                    self._session.rollback()
                    self._session.expire_all()
                except Exception:
                    pass
        if last_exc is not None:
            raise last_exc

    def query(self, *args, **kwargs):
        return _RetryingQuery(self._session.query(*args, **kwargs), self._session)

    def add(self, instance, **kwargs):
        return self._session.add(instance, **kwargs)

    def add_all(self, instances):
        return self._session.add_all(instances)

    def delete(self, instance):
        return self._session.delete(instance)

    def flush(self, objects=None):
        return self._session.flush(objects)

    def refresh(self, instance, *args, **kwargs):
        return self._session.refresh(instance, *args, **kwargs)

    def rollback(self):
        return self._session.rollback()

    def close(self):
        return self._session.close()

    def get(self, entity, ident):
        return self._session.get(entity, ident)

    def scalar(self, statement, **kwargs):
        return self._session.scalar(statement, **kwargs)

    def expire_all(self):
        return self._session.expire_all()

    def __getattr__(self, name):
        return getattr(self._session, name)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency: yield a DB session and close it after the request.
    Session is wrapped with _RetryingSession so execute/commit and query().first() etc. retry on SSL/connection errors.
    """
    db = SessionLocal()
    try:
        yield _RetryingSession(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
