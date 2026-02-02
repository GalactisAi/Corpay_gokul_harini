# One-off / maintenance scripts

Run these from the **backend** directory, with venv activated:

```bash
cd /path/to/Corpfront/backend
source venv/bin/activate
python scripts/ensure_admin.py   # or check_admin_user.py, etc.
```

Admin user is normally created automatically when the server starts (see `app/main.py` lifespan). Use these only if you need to fix or inspect admin without starting the server.
