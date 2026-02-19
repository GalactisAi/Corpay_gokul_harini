from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Backend uses only the cloud database (Supabase/PostgreSQL). No SQLite.
DATABASE_URL = (settings.database_url or "").strip()
if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError(
        "DATABASE_URL must be set to a PostgreSQL URL (e.g. Supabase). "
        "Set DATABASE_URL in backend .env and do not use SQLite."
    )

# PostgreSQL (Supabase) with SSL and connection pooling
engine = create_engine(
    DATABASE_URL,
    connect_args={"sslmode": "require"},
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
