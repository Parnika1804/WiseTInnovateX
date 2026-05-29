from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Participant, EventConfig
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
    skipped = 0 # Keep track of how many we skipped
    new_participants_for_email = [] # Store them here to email later

    for row in reader:
        email = row.get("email")
        
        # --- THE FIX: DEDUPLICATION CHECK ---
        # Check if a participant with this email already exists
        existing = db.query(Participant).filter(Participant.email == email).first()
        if existing:
            skipped += 1
            continue # Skip this row and move to the next one
            
        # Safely convert prior_hackathons to an integer
        hackathons_count = row.get("prior_hackathons", "0")
        try:
            hackathons_count = int(hackathons_count) if hackathons_count.strip() else 0
        except ValueError:
            hackathons_count = 0

        participant = Participant(
            name=row.get("name"),
            email=email,
            skill=row.get("skill"),
            background=row.get("background", ""),
            institution=row.get("institution", ""),
            
            study_year=row.get("study_year", ""),
            experience_level=row.get("experience_level", ""),
            prior_hackathons=hackathons_count,
            domain_interest=row.get("domain_interest", ""),
            tools_known=row.get("tools_known", ""),
            availability=row.get("availability", ""),
            role_preference=row.get("role_preference", "")
        )
        db.add(participant)
        new_participants_for_email.append(participant) # Add to our email list
        added += 1
    
    db.commit()

    # Fire welcome emails ONLY to the newly added participants
    if added > 0:
        try:
            from email_triggers import send_welcome_emails
            config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
            event_name = config.event_name if config else "the event"
            
            # Use the list we built instead of querying the database backward
            send_welcome_emails(new_participants_for_email, event_name, db)
        except Exception as e:
            print(f"[WELCOME EMAIL ERROR] {e}")  

    return {"message": f"{added} participants uploaded successfully. {skipped} duplicates skipped."}
    # Fire welcome emails to all newly uploaded participants
    try:
        from email_triggers import send_welcome_emails
        config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
        event_name = config.event_name if config else "the event"
        new_participants = db.query(Participant).order_by(Participant.id.desc()).limit(added).all()
        send_welcome_emails(new_participants, event_name, db)
    except Exception as e:
        print(f"[WELCOME EMAIL ERROR] {e}")  # Don't fail the upload if email fails

    return {"message": f"{added} participants uploaded successfully. Welcome emails sent."}


@router.delete("/roster/clear")
def clear_roster(db: Session = Depends(get_db)):
    """Delete all participants from the database."""
    count = db.query(Participant).count()
    db.query(Participant).delete()
    db.commit()
    return {"message": f"All {count} participants deleted successfully"}


@router.delete("/roster/{participant_id}")
def delete_participant(participant_id: int, db: Session = Depends(get_db)):
    """Delete a single participant by ID."""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    db.delete(participant)
    db.commit()
    return {"message": f"Participant {participant.name} deleted successfully"}


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
            "institution": p.institution,
            
            # --- NEW EXTENDED PROFILE COLUMNS ---
            "study_year": p.study_year,
            "experience_level": p.experience_level,
            "prior_hackathons": p.prior_hackathons,
            "domain_interest": p.domain_interest,
            "tools_known": p.tools_known,
            "availability": p.availability,
            "role_preference": p.role_preference,
            
            # Include the portfolio data in case the frontend needs it
            "tech_stack": p.tech_stack,
            "project_link": p.project_link,
            "resume_link": p.resume_link
        }
        for p in participants
    ]