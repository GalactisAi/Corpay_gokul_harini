from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Prefer cloud (Supabase); fall back to SQLite if connection fails so the server can start.
DATABASE_URL = (settings.database_url or "").strip() or "sqlite:///./dashboard.db"

def _pg_engine(url: str):
    return create_engine(
        url,
        connect_args={"sslmode": "require"},
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
        echo=False,
    )

def _sqlite_engine(url: str):
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
        warnings.warn(f"Supabase/Postgres connection failed ({e!r}). Using local SQLite so the server can start.")
        DATABASE_URL = "sqlite:///./dashboard.db"
        engine = _sqlite_engine(DATABASE_URL)
else:
    engine = _sqlite_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
