from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Participant
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

router = APIRouter()

SECRET_KEY = "eventflow-secret-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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