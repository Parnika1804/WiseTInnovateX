from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CommunicationLog
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class DraftRequest(BaseModel):
    recipient_email: str
    subject: str
    message: str

class SendRequest(BaseModel):
    log_id: int

@router.post("/comms/draft")
def draft_communication(request: DraftRequest, db: Session = Depends(get_db)):
    log = CommunicationLog(
        recipient_email=request.recipient_email,
        subject=request.subject,
        message=request.message,
        status="DRAFT"
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "message": "Communication drafted successfully",
        "log": {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "created_at": log.created_at
        }
    }


@router.post("/comms/send")
def send_communication(request: SendRequest, db: Session = Depends(get_db)):
    log = db.query(CommunicationLog).filter(CommunicationLog.id == request.log_id).first()

    if not log:
        raise HTTPException(status_code=404, detail="Communication log not found")

    if log.status == "SENT":
        raise HTTPException(status_code=400, detail="This communication has already been sent")

    log.status = "SENT"
    log.sent_at = datetime.utcnow()
    db.commit()

    print(f"[EMAIL LOG] To: {log.recipient_email} | Subject: {log.subject} | Message: {log.message}")

    return {
        "message": f"Communication sent successfully to {log.recipient_email}",
        "log": {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "sent_at": log.sent_at
        }
    }


@router.get("/comms/log")
def get_communication_log(db: Session = Depends(get_db)):
    logs = db.query(CommunicationLog).all()
    return [
        {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "sent_at": log.sent_at,
            "created_at": log.created_at
        }
        for log in logs
    ]