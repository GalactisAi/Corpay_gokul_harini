import sys
import os
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_here)
sys.path.insert(0, _backend)

print("Setting up admin user...")

try:
    from app.database import SessionLocal, Base, engine
    from app.models.user import User
    import bcrypt

    Base.metadata.create_all(bind=engine)
    print("✓ Tables created/verified")

    db = SessionLocal()

    password = "Cadmin@1"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    print("✓ Password hashed")

    db.query(User).filter(User.email == "admin@corpay.com").delete()
    print("✓ Cleared existing admin user")

    admin = User(
        email="admin@corpay.com",
        name="Admin User",
        password_hash=password_hash,
        is_admin=1
    )
    db.add(admin)
    db.commit()
    print("✓ Admin user created")

    test = db.query(User).filter(User.email == "admin@corpay.com").first()
    if test:
        valid = bcrypt.checkpw(password.encode("utf-8"), test.password_hash.encode("utf-8"))
        print(f"✓ Verification: {'PASSED' if valid else 'FAILED'}")
        print("✓✓✓ SUCCESS ✓✓✓")
        print("Email: admin@corpay.com")
        print("Password: Cadmin@1")
    else:
        print("✗ FAILED - User not found after creation")

    db.close()

except Exception as e:
    print(f"✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
