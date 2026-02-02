@echo off
cd /d "%~dp0"
if not exist "venv\Scripts\activate.bat" (
  echo Creating virtual environment...
  python -m venv venv
)
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
echo Starting backend on http://localhost:8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
