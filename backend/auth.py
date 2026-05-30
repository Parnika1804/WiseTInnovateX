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


def _pre_hash(password: str) -> bytes:
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
    # No team_id — judges evaluate ALL teams


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
    db.add(user)

    if role == "Participant":
        participant = Participant(
            name=request.name,
            email=request.email,
            skill=request.skill,
            background=request.background,
            institution=request.institution,
            source="self",
            registration_status="pending",
        )
        db.add(participant)

    db.commit()
    db.refresh(user)

    token = create_token({"email": user.email, "role": user.role, "name": user.name, "id": user.id})

    return {
        "message": f"Account created successfully as {role}",
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
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
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    }


@router.post("/auth/create-judge")
def create_judge(request: CreateJudgeRequest, db: Session = Depends(get_db)):
    """
    Creates (or reuses) a Judge user and emails them a magic link to the portal.
    Judges evaluate ALL teams — no team_id assignment.
    Always encodes request.name in the token so the portal shows the correct
    judge name even if a User record with that email already existed.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        user = User(
            name=request.name,
            email=request.email,
            password=hash_password("magiclink_auth_only"),
            role="Judge"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name/role in case it's an existing record with different data
        user.name = request.name
        user.role = "Judge"
        db.commit()

    # Always use request.name so the portal shows what the committee entered,
    # not a potentially stale name from a pre-existing DB record.
    token_data = {
        "email": user.email,
        "role": "Judge",
        "name": request.name,
    }
    token = create_token(token_data)
    magic_link = f"http://localhost:5173/judge-dashboard?token={token}"

    try:
        from email_service import send_email
        subject = "Judge Invitation — EventFlow Evaluation Portal"
        body = f"""Hello {request.name},

You have been invited to evaluate teams for the upcoming event.
We use a passwordless entry system. Please use your secure magic link below to access the Judge Portal and submit your scores for all teams.

Access your Judge Portal here:
{magic_link}

Please do not share this link — it is uniquely tied to your evaluation session.
"""
        result = send_email(to_email=request.email, subject=subject, body=body)
        if result.get("success"):
            print(f"✅ Judge magic link sent to {request.email}")
        else:
            print(f"❌ Email failed: {result.get('error')}")
    except Exception as e:
        print(f"❌ Failed to send Judge email: {e}")

    return {
        "message": f"Magic link dispatched to {request.name}",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    }


@router.get("/auth/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "created_at": u.created_at}
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
        return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")