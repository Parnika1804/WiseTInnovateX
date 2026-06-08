from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Mentor, Team, Participant
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
        result.append({
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "expertise": m.expertise,
            "phone": m.phone,
            "assigned_team_id": m.assigned_team_id,
            "assigned_team_name": team.name if team else None
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