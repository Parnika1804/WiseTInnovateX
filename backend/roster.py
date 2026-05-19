from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Participant
import csv
import io

router = APIRouter()

@router.post("/roster/upload")
async def upload_roster(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    added = 0
    for row in reader:
        participant = Participant(
            name=row.get("name"),
            email=row.get("email"),
            skill=row.get("skill"),
            background=row.get("background", ""),
            institution=row.get("institution", "")
        )
        db.add(participant)
        added += 1
    
    db.commit()
    return {"message": f"{added} participants uploaded successfully"}


@router.get("/roster")
def get_roster(db: Session = Depends(get_db)):
    participants = db.query(Participant).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "skill": p.skill,
            "background": p.background,
            "institution": p.institution
        }
        for p in participants
    ]