#!/usr/bin/env bash
# Backend run script: uses a single venv, creates it if missing, then starts the server.
set -e
cd "$(dirname "$0")"
VENV_DIR="venv"

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating virtual environment in $VENV_DIR..."
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
echo "Using Python: $(which python)"

# Ensure dependencies are installed (idempotent)
pip install -q -r requirements.txt

# PORT from .env (default 8080); export so Python can read it
export PORT="${PORT:-8080}"
if [ -f .env ]; then
  export $(grep -E '^PORT=' .env | xargs) 2>/dev/null || true
fi
echo "Starting backend on http://0.0.0.0:${PORT}"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --reload
