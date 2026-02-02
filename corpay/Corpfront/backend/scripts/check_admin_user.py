#!/usr/bin/env python3
"""Check if admin user exists and create if needed"""
import sys
import os
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_here)
sys.path.insert(0, _backend)

from app.database import SessionLocal
from app.models.user import User
import bcrypt

def check_and_create_admin():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@corpay.com").first()

        if admin_user:
            print(f"✓ Admin user exists:")
            print(f"  Email: {admin_user.email}")
            print(f"  Name: {admin_user.name}")
            print(f"  Is Admin: {admin_user.is_admin}")
            print(f"  Has Password Hash: {bool(admin_user.password_hash)}")

            password = "Cadmin@1"
            try:
                is_valid = bcrypt.checkpw(
                    password.encode("utf-8"),
                    admin_user.password_hash.encode("utf-8")
                )
                print(f"  Password verification: {'✓ Valid' if is_valid else '✗ Invalid'}")
            except Exception as e:
                print(f"  Password verification error: {e}")
        else:
            print("✗ Admin user does not exist. Creating...")
            password = "Cadmin@1"
            password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

            admin_user = User(
                email="admin@corpay.com",
                name="Admin User",
                password_hash=password_hash,
                is_admin=1
            )
            db.add(admin_user)
            db.commit()
            print("✓ Admin user created successfully!")
            print(f"  Email: admin@corpay.com")
            print(f"  Password: Cadmin@1")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    check_and_create_admin()
