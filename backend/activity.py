from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from database import get_db, Base
from datetime import datetime

router = APIRouter()

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    description = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def log_action(db: Session, action: str, description: str, performed_by: str = "committee"):
    entry = ActivityLog(
        action=action,
        description=description,
        performed_by=performed_by
    )
    db.add(entry)
    db.commit()


@router.post("/activity/log")
def create_log(action: str, description: str, performed_by: str = "committee", db: Session = Depends(get_db)):
    log_action(db, action, description, performed_by)
    return {"message": "Action logged successfully"}


@router.get("/activity")
def get_activity_log(db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "description": log.description,
            "performed_by": log.performed_by,
            "created_at": log.created_at
        }
        for log in logs
    ]