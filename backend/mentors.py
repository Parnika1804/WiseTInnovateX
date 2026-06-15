from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Mentor, Team, Participant
from pydantic import BaseModel
from typing import Optional
import csv
import io
import json

router = APIRouter()


@router.post("/mentors/upload")
async def upload_mentors(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    added = 0
    for row in reader:
        mentor = Mentor(
            name=row.get("name", "").strip(),
            email=row.get("email", "").strip(),
            expertise=row.get("expertise", "").strip(),
            phone=row.get("phone", "").strip(),
        )
        db.add(mentor)
        added += 1

    db.commit()
    return {"message": f"{added} mentors uploaded successfully"}


@router.get("/mentors")
def get_mentors(db: Session = Depends(get_db)):
    mentors = db.query(Mentor).all()
    result = []
    for m in mentors:
        team = db.query(Team).filter(Team.id == m.assigned_team_id).first() if m.assigned_team_id else None
        rationale = getattr(team, 'mentor_rationale', None) if team else None
        result.append({
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "expertise": m.expertise,
            "phone": m.phone,
            "assigned_team_id": m.assigned_team_id,
            "assigned_team_name": team.name if team else None,
            "mentor_rationale": rationale
        })
    return result


@router.delete("/mentors/clear")
def clear_mentors(db: Session = Depends(get_db)):
    count = db.query(Mentor).count()
    db.query(Mentor).delete()
    db.commit()
    return {"message": f"{count} mentors cleared"}


@router.post("/mentors/send-intro-emails")
def send_intro_emails(db: Session = Depends(get_db)):
    from email_triggers import send_mentor_emails
    result = send_mentor_emails(db)
    return result


@router.post("/mentors/send-portal-links")
def send_mentor_portal_links(db: Session = Depends(get_db)):
    from email_triggers import send_mentor_link_emails
    result = send_mentor_link_emails(db)
    return result


class ReassignRequest(BaseModel):
    new_mentor_id: int


@router.patch("/mentors/{team_id}/reassign")
def reassign_mentor(team_id: int, request: ReassignRequest, db: Session = Depends(get_db)):
    # Unassign any mentor currently assigned to this team
    current_mentor = db.query(Mentor).filter(Mentor.assigned_team_id == team_id).first()
    if current_mentor:
        current_mentor.assigned_team_id = None

    # Assign new mentor
    new_mentor = db.query(Mentor).filter(Mentor.id == request.new_mentor_id).first()
    if not new_mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    # Allow reassignment even if mentor already has a team — just move them
    new_mentor.assigned_team_id = team_id
    db.commit()

    team = db.query(Team).filter(Team.id == team_id).first()

    if team:
        try:
            from gemini import generate_mentor_rationale
            generate_mentor_rationale(new_mentor, team, db)
        except Exception:
            pass

    return {
        "message": f"{new_mentor.name} reassigned to {team.name if team else 'team'}",
        "mentor_id": new_mentor.id,
        "team_id": team_id
    }


class ManualAssignRequest(BaseModel):
    mentor_id: int
    team_id: int


@router.patch("/mentors/manual-assign")
def manual_assign_mentor(request: ManualAssignRequest, db: Session = Depends(get_db)):
    """Assign any mentor to any team — used for unassigned mentors."""
    mentor = db.query(Mentor).filter(Mentor.id == request.mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    mentor.assigned_team_id = request.team_id
    db.commit()

    return {
        "message": f"{mentor.name} assigned to {team.name}",
        "mentor_id": mentor.id,
        "team_id": request.team_id
    }