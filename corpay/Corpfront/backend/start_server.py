#!/usr/bin/env python3
"""Start the backend server. Admin user is initialized in app lifespan (app/main.py)."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
import uvicorn

_PORT = int(os.environ.get("PORT", "8000"))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=_PORT, reload=True)
