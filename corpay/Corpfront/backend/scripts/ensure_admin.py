import sys
import os
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_here)
sys.path.insert(0, _backend)

from app.database import SessionLocal, engine, Base
from app.models.user import User
import bcrypt

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    password = "Cadmin@1"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    admin_user = db.query(User).filter(User.email == "admin@corpay.com").first()

    if admin_user:
        admin_user.password_hash = password_hash
        admin_user.is_admin = 1
        print("Updated admin user password")
    else:
        admin_user = User(
            email="admin@corpay.com",
            name="Admin User",
            password_hash=password_hash,
            is_admin=1
        )
        db.add(admin_user)
        print("Created admin user")

    db.commit()
    print("SUCCESS: Admin user ready - admin@corpay.com / Cadmin@1")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
    sys.exit(1)
finally:
    db.close()
