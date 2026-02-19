#!/usr/bin/env python3
"""
Sync all data from local SQLite (dashboard.db) to cloud Supabase/PostgreSQL.
Uses DATABASE_URL from .env for the cloud connection.
Run from the backend directory: python sync_local_to_cloud.py
"""
from pathlib import Path
import sys

# Load backend .env before any app imports so DATABASE_URL is set
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.config import settings
from app.models import (
    Revenue,
    RevenueTrend,
    RevenueProportion,
    SharePrice,
    SocialPost,
    EmployeeMilestone,
    PaymentData,
    SystemPerformance,
    FileUpload,
    User,
    ApiConfig,
)

# All ORM models and their optional unique key for duplicate check (besides pk)
MODELS = [
    (Revenue, None),
    (RevenueTrend, None),
    (RevenueProportion, "category"),
    (SharePrice, None),
    (SocialPost, None),
    (EmployeeMilestone, None),
    (PaymentData, "date"),
    (SystemPerformance, None),
    (FileUpload, None),
    (User, "email"),
    (ApiConfig, "config_key"),
]

LOCAL_URL = "sqlite:///./dashboard.db"


def row_to_dict(row, model):
    """Convert ORM row to dict of column names -> values, handling DateTime, Enum, etc."""
    d = {}
    for c in model.__table__.columns:
        val = getattr(row, c.key)
        # Leave None, int, float, str as-is; datetime/date are serializable
        if hasattr(val, "isoformat"):
            val = val.isoformat() if val is not None else None
        elif hasattr(val, "value"):  # Enum
            val = val.value if val is not None else None
        d[c.key] = val
    return d


def dict_to_row_data(model, d):
    """Convert dict back to types suitable for model constructor (e.g. string dates -> datetime)."""
    from datetime import datetime, date
    from app.models.file_upload import FileType

    out = {}
    for c in model.__table__.columns:
        key = c.key
        val = d.get(key)
        if val is None:
            out[key] = None
            continue
        try:
            type_str = str(c.type).lower()
            py_type = getattr(c.type, "python_type", None)
            if py_type == datetime or "datetime" in type_str:
                if isinstance(val, str):
                    val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                out[key] = val
            elif py_type == date or "date" in type_str and "time" not in type_str:
                if isinstance(val, str):
                    val = date.fromisoformat(val[:10])
                out[key] = val
            elif key == "file_type":
                if isinstance(val, str):
                    val = FileType(val)
                out[key] = val
            else:
                out[key] = val
        except Exception:
            out[key] = val
    return out


def table_exists(engine, table_name):
    return inspect(engine).has_table(table_name)


def main():
    cloud_url = settings.database_url or ""
    if not cloud_url or cloud_url.startswith("sqlite"):
        print("ERROR: DATABASE_URL in .env must be a non-SQLite URL (e.g. PostgreSQL/Supabase).")
        sys.exit(1)

    print("Connecting to local SQLite:", LOCAL_URL)
    print("Connecting to cloud:", cloud_url.split("@")[-1] if "@" in cloud_url else cloud_url[:50] + "...")
    print()

    engine_local = create_engine(
        LOCAL_URL,
        connect_args={"check_same_thread": False},
    )
    engine_cloud = create_engine(
        cloud_url,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=0,
    )

    # Create any missing tables in the cloud
    Base.metadata.create_all(bind=engine_cloud)
    print("Ensured all tables exist in cloud.")
    print()

    SessionLocal = sessionmaker(bind=engine_local, autocommit=False, autoflush=False)
    SessionCloud = sessionmaker(bind=engine_cloud, autocommit=False, autoflush=False)

    summary = []

    for model, unique_key in MODELS:
        table_name = model.__table__.name
        if not table_exists(engine_local, table_name):
            print(f"  [SKIP] {table_name}: table does not exist locally")
            summary.append((table_name, 0))
            continue

        sess_local = SessionLocal()
        sess_cloud = SessionCloud()
        try:
            local_rows = sess_local.query(model).all()
            pk_name = model.__table__.primary_key.columns.keys()[0]
            inserted = 0
            skipped = 0

            for row in local_rows:
                row_dict = row_to_dict(row, model)
                pk_val = row_dict.get(pk_name)

                # Exists in cloud by primary key?
                existing = sess_cloud.query(model).filter(getattr(model, pk_name) == pk_val).first()
                if existing:
                    skipped += 1
                    continue
                # Optional: check by unique key if no pk match (e.g. different id in cloud)
                if unique_key and unique_key in row_dict:
                    uq_val = row_dict[unique_key]
                    if sess_cloud.query(model).filter(getattr(model, unique_key) == uq_val).first():
                        skipped += 1
                        continue

                try:
                    data = dict_to_row_data(model, row_dict)
                    new_row = model(**data)
                    sess_cloud.add(new_row)
                    sess_cloud.commit()
                    inserted += 1
                except Exception as e:
                    sess_cloud.rollback()
                    print(f"    Warning: insert failed for {table_name} pk={pk_val}: {e}")
                    continue

            print(f"  {table_name}: {inserted} inserted, {skipped} already in cloud (total local: {len(local_rows)})")
            summary.append((table_name, inserted))
        except Exception as e:
            sess_cloud.rollback()
            print(f"  [ERROR] {table_name}: {e}")
            summary.append((table_name, -1))
        finally:
            sess_local.close()
            sess_cloud.close()

    print()
    print("--- Summary ---")
    for table_name, count in summary:
        if count >= 0:
            print(f"  {table_name}: {count} rows synced")
        else:
            print(f"  {table_name}: ERROR")
    print("Done.")


if __name__ == "__main__":
    main()
