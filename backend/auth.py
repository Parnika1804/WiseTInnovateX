from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Participant
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
import hashlib

router = APIRouter()

SECRET_KEY = "eventflow-secret-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


# ---------------------------------------------------------------------------
# Password helpers — uses bcrypt directly (no passlib) to avoid the
# "password cannot be longer than 72 bytes" crash in bcrypt v4+.
# Pre-hashing with SHA-256 keeps the input to bcrypt at exactly 32 bytes,
# safely under the limit regardless of what the user types.
# ---------------------------------------------------------------------------

def _pre_hash(password: str) -> bytes:
    """SHA-256 digest of the password — always 32 bytes, safe for bcrypt."""
    return hashlib.sha256(password.encode("utf-8")).digest()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pre_hash(password), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_pre_hash(plain), hashed.encode("utf-8"))


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    skill: str
    background: str = ""
    institution: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateJudgeRequest(BaseModel):
    name: str
    email: str
    password: str


@router.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    committee_exists = db.query(User).filter(User.role == "Committee").first()
    role = "Committee" if not committee_exists else "Participant"

    user = User(
        name=request.name,
        email=request.email,
        password=hash_password(request.password),
        role=role
    )
    participant = Participant(
    name=request.name,
    email=request.email,
    skill=request.skill,
    background=request.background,
    institution=request.institution
    )
    db.add(user)

    if role == "Participant":
        db.add(participant)

    db.commit()
    db.refresh(user)

    token = create_token({"email": user.email, "role": user.role, "name": user.name, "id": user.id})

    return {
        "message": f"Account created successfully as {role}",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


@router.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"email": user.email, "role": user.role, "name": user.name, "id": user.id})

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


@router.post("/auth/create-judge")
def create_judge(request: CreateJudgeRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=request.name,
        email=request.email,
        password=hash_password(request.password),
        role="Judge"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # --- THE MISSING EMAIL LOGIC ---
    # --- THE MISSING EMAIL LOGIC ---
    try:
        # Import the CORRECT function from the CORRECT file
        from email_service import send_email 
        
        subject = "Welcome to the Judging Panel!"
        body = f"""
        Hello {request.name},
        
        You have been registered as a Judge for the upcoming event.
        Here are your login credentials:
        
        Email: {request.email}
        Password: {request.password}
        
        Please log in to the portal to view the teams.
        """
        
        # Call your actual SMTP function!
        result = send_email(to_email=request.email, subject=subject, body=body)
        
        if result.get("success"):
            print(f"✅ Judge email actually sent to {request.email}")
        else:
            print(f"❌ Email failed to send: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Failed to send Judge email: {e}")
    # -------------------------------
    return {
        "message": f"Judge account created for {request.name}",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }

@router.get("/auth/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at
        }
        for u in users
    ]


@router.get("/auth/me")
def get_me(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")