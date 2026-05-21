from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CommunicationLog, Team, Participant
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from gemini import call_gemini
import json

router = APIRouter()

class DraftRequest(BaseModel):
    recipient_email: str
    subject: str
    message: str

class SendRequest(BaseModel):
    log_id: int

class GeminiDraftRequest(BaseModel):
    stage: str
    team_id: Optional[int] = None
    recipient_email: str

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


@router.post("/comms/draft/gemini")
def draft_communication_gemini(request: GeminiDraftRequest, db: Session = Depends(get_db)):

    if request.stage == "TEAM_ASSIGNMENT":
        if not request.team_id:
            raise HTTPException(status_code=400, detail="team_id is required for TEAM_ASSIGNMENT stage")

        team = db.query(Team).filter(Team.id == request.team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        member_ids = json.loads(team.member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        member_names = [m.name for m in members]
        member_skills = [m.skill for m in members]

        prompt = f"""You are an event coordinator. Write a warm and professional team assignment email for a hackathon participant.

Team Name: {team.name}
Team Members: {', '.join(member_names)}
Team Skills: {', '.join(member_skills)}
Recipient Email: {request.recipient_email}

Write a concise welcome email (3-4 sentences) that:
- Announces their team assignment
- Lists their team members and skills
- Encourages them to connect with teammates
- Mentions the hackathon is starting soon

Do not include subject line, just the email body."""

        subject = f"Your Team Assignment — {team.name}"

    elif request.stage == "EVALUATION_REMINDER":
        prompt = f"""You are an event coordinator. Write a professional evaluation reminder email for a hackathon participant.

Recipient Email: {request.recipient_email}

Write a concise reminder email (3-4 sentences) that:
- Reminds them evaluation is coming up soon
- Encourages them to prepare their presentation
- Mentions judges will be evaluating based on innovation, execution and impact
- Wishes them good luck

Do not include subject line, just the email body."""

        subject = "Evaluation Reminder — Hackathon"

    else:
        raise HTTPException(status_code=400, detail="stage must be TEAM_ASSIGNMENT or EVALUATION_REMINDER")

    gemini_message = call_gemini(prompt)

    log = CommunicationLog(
        recipient_email=request.recipient_email,
        subject=subject,
        message=gemini_message,
        status="DRAFT"
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "message": "Gemini drafted communication ready for preview",
        "preview": {
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