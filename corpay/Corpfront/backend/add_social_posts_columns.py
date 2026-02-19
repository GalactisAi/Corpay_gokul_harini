"""
One-off script to add missing post_url and source columns to social_posts in the cloud DB.
Run from backend dir: python add_social_posts_columns.py
"""
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from sqlalchemy import create_engine, text

from app.config import settings

def main():
    url = (settings.database_url or "").strip()
    if not url or not url.startswith("postgresql"):
        print("DATABASE_URL is not set or not PostgreSQL. Skipping.")
        return
    engine = create_engine(url, connect_args={"sslmode": "require"})
    with engine.connect() as conn:
        # Add columns if they don't exist (PostgreSQL 9.5+)
        for col, defn in [
            ("post_url", "VARCHAR(500)"),
            ("source", "VARCHAR(50)"),
        ]:
            try:
                conn.execute(text(
                    f"ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS {col} {defn}"
                ))
                conn.commit()
                if col == "source":
                    conn.execute(text(
                        "ALTER TABLE social_posts ALTER COLUMN source SET DEFAULT 'api'"
                    ))
                    conn.commit()
                print(f"Column social_posts.{col} ensured.")
            except Exception as e:
                print(f"Column {col}: {e}")
    print("Done.")

if __name__ == "__main__":
    main()
