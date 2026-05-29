from database import SessionLocal, init_db
from models import User
from auth import hash_password # <-- Importing your custom hashing function!

def seed():
    init_db()
    db = SessionLocal()

    existing = db.query(User).filter(User.email == "admin@eventflow.com").first()
    if existing:
        print("Committee account already exists — skipping")
        db.close()
        return

    committee = User(
        name="Committee Admin",
        email="admin@eventflow.com",
        password=hash_password("admin123"), # <-- Using the new function here!
        role="Committee"
    )
    db.add(committee)
    db.commit()
    print("Committee account created successfully")
    print("Email: admin@eventflow.com")
    print("Password: admin123")
    db.close()

if __name__ == "__main__":
    seed()