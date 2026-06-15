from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CommunicationLog, Team, Participant, EventConfig
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from gemini import call_gemini
from email_service import send_email
from activity import log_action
import json

router = APIRouter()


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
@router.delete("/comms/log/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db)):
    """Deletes a specific communication log entry."""
    log_entry = db.query(CommunicationLog).filter(CommunicationLog.id == log_id).first()
    
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    recipient = log_entry.recipient_email
    subject = log_entry.subject
        
    db.delete(log_entry)
    db.commit()
    log_action(
        db=db,
        action="COMM_LOG_DELETED",
        description=f"Communication history log item ID {log_id} to {recipient} ('{subject}') was permanently removed.",
        performed_by="committee"
    )
    return {"message": "Log entry deleted successfully"}

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

class AnnounceRequest(BaseModel):
    """
    Committee sends a short announcement like 'venue changed to Room 201'.
    The system uses Gemini to expand it into a proper email.
    send_to: 'all'  →  all participants
             'team:{id}'  →  members of that team only
    """
    announcement: str          # e.g. "venue changed to Room 201"
    send_to: str = "all"       # "all" | "team:1" | "team:3" etc.
    custom_subject: Optional[str] = None  # optional override subject


# ---------------------------------------------------------------------------
# Draft (manual)
# ---------------------------------------------------------------------------

@router.post("/comms/draft")
def draft_communication(request: DraftRequest, db: Session = Depends(get_db)):
    log = CommunicationLog(
        recipient_email=request.recipient_email,
        subject=request.subject,
        message=request.message,
        comm_type="MANUAL",
        status="DRAFT",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    log_action(
        db=db,
        action="EMAIL_DRAFTED_MANUAL",
        description=f"Manually created a custom communication draft for {log.recipient_email}. Subject: '{log.subject}'.",
        performed_by="committee"
    )

    return {
        "message": "Communication drafted successfully",
        "log": {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "created_at": log.created_at,
        },
    }


# ---------------------------------------------------------------------------
# Gemini-powered draft
# ---------------------------------------------------------------------------

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

        # Pull event name from active config if available
        config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
        event_name = config.event_name if config else "the event"

        prompt = f"""You are an event coordinator. Write a warm and professional team assignment email for a hackathon participant.

Event: {event_name}
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
        config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
        event_name = config.event_name if config else "the event"

        prompt = f"""You are an event coordinator. Write a professional evaluation reminder email for a hackathon participant.

Event: {event_name}
Recipient Email: {request.recipient_email}

Write a concise reminder email (3-4 sentences) that:
- Reminds them evaluation is coming up soon
- Encourages them to prepare their presentation
- Mentions judges will be evaluating based on innovation, execution and impact
- Wishes them good luck

Do not include subject line, just the email body."""

        subject = f"Evaluation Reminder — {event_name}"

    else:
        raise HTTPException(status_code=400, detail="stage must be TEAM_ASSIGNMENT or EVALUATION_REMINDER")

    gemini_message = call_gemini(prompt)

    log = CommunicationLog(
        recipient_email=request.recipient_email,
        subject=subject,
        message=gemini_message,
        comm_type=request.stage,
        status="DRAFT",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    log_action(
        db=db,
        action=f"EMAIL_DRAFTED_{log.comm_type}",
        description=f"Generated an AI-powered email draft template for {log.recipient_email} targeting the context of {request.stage.lower().replace('_', ' ')}.",
        performed_by="committee"
    )

    return {
        "message": "Gemini drafted communication ready for preview",
        "preview": {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "created_at": log.created_at,
        },
    }


# ---------------------------------------------------------------------------
# Send — marks SENT and fires real SendGrid email
# ---------------------------------------------------------------------------

@router.post("/comms/send")
def send_communication(request: SendRequest, db: Session = Depends(get_db)):
    log = db.query(CommunicationLog).filter(CommunicationLog.id == request.log_id).first()

    if not log:
        raise HTTPException(status_code=404, detail="Communication log not found")

    if log.status == "SENT":
        raise HTTPException(status_code=400, detail="This communication has already been sent")

    # Fire the real email via SendGrid
    result = send_email(log.recipient_email, log.subject, log.message)

    log.status = "SENT"
    log.sent_at = datetime.utcnow()
    db.commit()
    log_action(
        db=db,
        action=f"EMAIL_SENT_{log.comm_type}",
        description=f"Dispatched direct transmission message item ID {log.id} to recipient {log.recipient_email}. Status: {'SUCCESS' if result['success'] else 'FAILED'}.",
        performed_by="committee"
    )

    response = {
        "message": f"Communication sent successfully to {log.recipient_email}",
        "email_delivery": result,
        "log": {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "sent_at": log.sent_at,
        },
    }

    if not result["success"]:
        response["warning"] = "Email could not be delivered via SendGrid. Check SENDGRID_API_KEY env var."

    return response


# ---------------------------------------------------------------------------
# Announce — committee types "venue changed" → Gemini drafts → sends to all
# ---------------------------------------------------------------------------

@router.post("/comms/announce")
def send_announcement(request: AnnounceRequest, db: Session = Depends(get_db)):
    """
    Committee types a short announcement.
    Gemini drafts a proper email from it.
    The email is sent to all participants OR to members of a specific team.
    """
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    # Determine recipients
    if request.send_to == "all":
        participants = db.query(Participant).all()
        target_label = "all participants"
    elif request.send_to.startswith("team:"):
        try:
            team_id = int(request.send_to.split(":")[1])
        except (IndexError, ValueError):
            raise HTTPException(status_code=400, detail="send_to format must be 'all' or 'team:{id}'")

        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail=f"Team {team_id} not found")

        member_ids = json.loads(team.member_ids)
        participants = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        target_label = f"team {team.name}"
    else:
        raise HTTPException(status_code=400, detail="send_to must be 'all' or 'team:{id}'")

    if not participants:
        raise HTTPException(status_code=400, detail="No participants found to send announcement to")

    # Use Gemini to draft the email body from the short announcement
    prompt = f"""You are an event coordinator. A committee member sent this short announcement:

"{request.announcement}"

Write a clear, professional email to participants about this update.
Event: {event_name}
Keep it concise (3-5 sentences). Start directly with the news — no filler openers.
Do not include a subject line. Just the email body."""

    body = call_gemini(prompt)

    # Subject: use custom or auto-generate
    if request.custom_subject:
        subject = request.custom_subject
    else:
        # Quick subject from Gemini
        subj_prompt = f"Write a short email subject line (under 10 words) for this announcement: '{request.announcement}'. Only the subject text, nothing else."
        subject = call_gemini(subj_prompt).strip().strip('"').strip("'")
        subject = f"[{event_name}] {subject}"

    # Send to each recipient and log
    sent_count = 0
    failed_count = 0
    logs_created = []

    for p in participants:
        # Personalise the body slightly
        personalised_body = f"Hi {p.name},\n\n{body}"

        result = send_email(p.email, subject, personalised_body)

        log = CommunicationLog(
            recipient_email=p.email,
            subject=subject,
            message=personalised_body,
            comm_type="ANNOUNCEMENT",
            status="SENT" if result["success"] else "FAILED",
            sent_at=datetime.utcnow() if result["success"] else None,
        )
        db.add(log)
        if result["success"]:
            sent_count += 1
        else:
            failed_count += 1

    db.commit()
    log_action(
        db=db,
        action="ANNOUNCEMENT_DISPATCHED",
        description=f"Broadcasted live announcement update to {target_label}. Successfully dispatched: {sent_count} deliveries. Brief context: '{request.announcement[:60]}...'",
        performed_by="committee"
    )

    return {
        "message": f"Announcement dispatched to {target_label}",
        "subject": subject,
        "body_preview": body[:200] + "..." if len(body) > 200 else body,
        "sent": sent_count,
        "failed": failed_count,
    }


# ---------------------------------------------------------------------------
# Stage-trigger endpoint — committee advances a stage from the dashboard
# ---------------------------------------------------------------------------

@router.post("/comms/trigger-stage")
def trigger_stage_email(stage: str, db: Session = Depends(get_db)):
    """
    Called when the committee moves to a new pipeline stage.
    Results / progression emails are saved as PENDING_APPROVAL, not sent immediately.
    """
    from email_triggers import trigger_stage_emails
    result = trigger_stage_emails(stage, db)
    return result


# ---------------------------------------------------------------------------
# Approval gate — list / approve / reject pending comms
# ---------------------------------------------------------------------------

@router.get("/comms/pending")
def get_pending_comms(db: Session = Depends(get_db)):
    """Return all communications awaiting committee approval."""
    logs = (
        db.query(CommunicationLog)
        .filter(CommunicationLog.status == "PENDING_APPROVAL")
        .order_by(CommunicationLog.created_at.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "comm_type": log.comm_type,
            "batch_id": log.batch_id,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.post("/comms/approve/{log_id}")
def approve_communication(log_id: int, db: Session = Depends(get_db)):
    """Approve a single pending communication and send it via SendGrid."""
    log = db.query(CommunicationLog).filter(CommunicationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Communication log not found")
    if log.status != "PENDING_APPROVAL":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve — current status is '{log.status}'",
        )

    result = send_email(log.recipient_email, log.subject, log.message)

    log.status = "SENT"
    log.sent_at = datetime.utcnow()
    db.commit()
    log_action(
        db=db,
        action="APPROVAL_GRANTED",
        description=f"Single transmission authorization granted for item ID {log.id} to recipient {log.recipient_email}.",
        performed_by="committee"
    )

    resp = {
        "message": f"Approved and sent to {log.recipient_email}",
        "email_delivery": result,
        "log_id": log.id,
    }
    if not result["success"]:
        resp["warning"] = "SendGrid delivery failed. Check SENDGRID_API_KEY."
    return resp


class ApproveBatchRequest(BaseModel):
    batch_id: str


@router.post("/comms/approve-batch")
def approve_batch(request: ApproveBatchRequest, db: Session = Depends(get_db)):
    """Approve and send all PENDING_APPROVAL emails in a given batch."""
    logs = (
        db.query(CommunicationLog)
        .filter(
            CommunicationLog.batch_id == request.batch_id,
            CommunicationLog.status == "PENDING_APPROVAL",
        )
        .all()
    )
    if not logs:
        raise HTTPException(
            status_code=404,
            detail=f"No pending emails found for batch '{request.batch_id}'",
        )
        
    is_results_batch = any(log.comm_type in ["RESULTS_QUALIFIED", "RESULTS_NOT_QUALIFIED"] for log in logs)
    is_welcome_batch = any(log.comm_type == "WELCOME" for log in logs)

    if is_results_batch:
        log_action(
            db=db,
            action="RESULTS_APPROVED",
            description=f"The evaluation results pipeline clearance was granted for communication batch ID: {request.batch_id}.",
            performed_by="committee"
        )
    elif is_welcome_batch:
        log_action(
            db=db,
            action="APPROVAL_GRANTED",
            description=f"Welcome email dispatch authorization granted for batch ID: {request.batch_id}.",
            performed_by="committee"
        )
    else:
        log_action(
            db=db,
            action="APPROVAL_GRANTED",
            description=f"Batch dispatch authorization granted for processing container ID: {request.batch_id}.",
            performed_by="committee"
        )

    sent_count = 0
    failed_count = 0
    for log in logs:
        result = send_email(log.recipient_email, log.subject, log.message)
        log.status = "SENT"
        log.sent_at = datetime.utcnow()
        if result["success"]:
            sent_count += 1
        else:
            failed_count += 1
            
    db.commit()
    
    if is_results_batch:
        log_action(
            db=db,
            action="RESULTS_PUBLISHED",
            description=f"Leaderboard progression outcomes successfully published. {sent_count} official notification dispatches sent to participants.",
            performed_by="committee"
        )
    elif is_welcome_batch:
        log_action(
            db=db,
            action="WELCOME_EMAILS_SENT",
            description=f"Successfully dispatched {sent_count} welcome emails for batch {request.batch_id}.",
            performed_by="committee"
        )
    else:
        log_action(
            db=db,
            action="BATCH_COMMUNICATION_SENT",
            description=f"Successfully transmitted a collection of {sent_count} queued pipeline messages for batch {request.batch_id}.",
            performed_by="committee"
        )
        
    return {
        "message": f"Batch '{request.batch_id}' approved",
        "sent": sent_count,
        "failed": failed_count,
    }


@router.post("/comms/reject/{log_id}")
def reject_communication(log_id: int, db: Session = Depends(get_db)):
    """Reject (discard) a single pending communication without sending it."""
    log = db.query(CommunicationLog).filter(CommunicationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Communication log not found")
    if log.status != "PENDING_APPROVAL":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject — current status is '{log.status}'",
        )
    log.status = "REJECTED"
    db.commit()
    log_action(
        db=db,
        action="APPROVAL_REJECTED",
        description=f"Discarded communication request item ID {log_id} intended for recipient {log.recipient_email}.",
        performed_by="committee"
    )
    return {"message": f"Communication {log_id} rejected and will not be sent."}


@router.post("/comms/reject-batch")
def reject_batch(request: ApproveBatchRequest, db: Session = Depends(get_db)):
    """Reject all PENDING_APPROVAL emails in a given batch."""
    logs = (
        db.query(CommunicationLog)
        .filter(
            CommunicationLog.batch_id == request.batch_id,
            CommunicationLog.status == "PENDING_APPROVAL",
        )
        .all()
    )
    if not logs:
        raise HTTPException(
            status_code=404,
            detail=f"No pending emails found for batch '{request.batch_id}'",
        )
    count = len(logs)
    for log in logs:
        log.status = "REJECTED"
    db.commit()
    log_action(
        db=db,
        action="APPROVAL_REJECTED",
        description=f"Rejected batch dispatch approval request container '{request.batch_id}'. Dropped {count} queued transmission log elements.",
        performed_by="committee"
    )
    return {"message": f"Batch '{request.batch_id}' rejected", "rejected": count}


# ---------------------------------------------------------------------------
# Get log
# ---------------------------------------------------------------------------

@router.get("/comms/log")
def get_communication_log(db: Session = Depends(get_db)):
    logs = db.query(CommunicationLog).order_by(CommunicationLog.created_at.desc()).all()
    return [
        {
            "id": log.id,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "message": log.message,
            "status": log.status,
            "comm_type": log.comm_type,
            "batch_id": log.batch_id,
            "sent_at": log.sent_at,
            "created_at": log.created_at,
        }
        for log in logs
    ]