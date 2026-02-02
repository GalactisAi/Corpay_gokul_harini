#!/usr/bin/env python3
"""Start the backend server. Admin user is initialized in app lifespan (app/main.py)."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
