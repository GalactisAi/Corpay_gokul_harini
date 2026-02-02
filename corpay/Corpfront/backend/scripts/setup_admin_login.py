#!/usr/bin/env python3
"""Setup admin login credentials"""
import sys
import os
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_here)
sys.path.insert(0, _backend)

from app.database import SessionLocal, engine, Base
from app.models.user import User
import bcrypt

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    password = "Cadmin@1"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    admin_user = db.query(User).filter(User.email == "admin@corpay.com").first()

    if admin_user:
        admin_user.password_hash = password_hash
        admin_user.is_admin = 1
        admin_user.name = "Admin User"
        print("✓ Updated admin user")
    else:
        admin_user = User(
            email="admin@corpay.com",
            name="Admin User",
            password_hash=password_hash,
            is_admin=1
        )
        db.add(admin_user)
        print("✓ Created admin user")

    db.commit()

    test_user = db.query(User).filter(User.email == "admin@corpay.com").first()
    if test_user:
        is_valid = bcrypt.checkpw(
            password.encode("utf-8"),
            test_user.password_hash.encode("utf-8")
        )
        print(f"✓ Email: admin@corpay.com")
        print(f"✓ Password: Cadmin@1")
        print(f"✓ Password verification: {'PASSED' if is_valid else 'FAILED'}")
        print(f"✓ Is Admin: {test_user.is_admin}")
    else:
        print("✗ Failed to create user")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
    sys.exit(1)
finally:
    db.close()

print("\n✓ Admin login setup complete!")
print("You can now login with:")
print("  Email: admin@corpay.com")
print("  Password: Cadmin@1")
