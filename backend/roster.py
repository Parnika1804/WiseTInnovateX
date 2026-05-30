from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Participant, User, EventConfig
import csv
import io
from auth import create_token, hash_password
from email_triggers import _save_and_send
from activity import log_action

router = APIRouter()

@router.post("/roster/upload")
async def upload_roster(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    added = 0
    skipped = 0
    new_participants = []

    for row in reader:
        email = row.get("email", "").strip()
        if not email:
            skipped += 1
            continue

        # Skip if Participant record already exists
        existing_participant = db.query(Participant).filter(Participant.email == email).first()
        if existing_participant:
            skipped += 1
            continue

        # Safely parse integer fields
        hackathons_count = row.get("prior_hackathons", "0")
        try:
            hackathons_count = int(hackathons_count) if hackathons_count.strip() else 0
        except ValueError:
            hackathons_count = 0

        # Upsert the User record — create only if one doesn't already exist for this email.
        # Without this check the INSERT fails with UNIQUE constraint when the same CSV
        # is uploaded more than once or when a prior self-registration used the same email.
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=row.get("name"),
                email=email,
                password=hash_password("magiclink_auth_only"),
                role="Participant"
            )
            db.add(user)
            db.flush()  # get user.id without committing yet

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
            role_preference=row.get("role_preference", ""),
            tech_stack=row.get("tech_stack", ""),
            project_link=row.get("project_link", ""),
            resume_link=row.get("resume_link", ""),
            source="csv",
            registration_status="approved"
        )
        db.add(participant)
        # Snapshot into a plain dict BEFORE db.commit() expires ORM objects.
        # After commit(), accessing user.name/.email triggers SQLAlchemy lazy
        # reload which can return the last-committed row's data instead of this
        # participant's data — causing Alice to be addressed as Ankita, etc.
        new_participants.append({
            "id": user.id,
            "name": row.get("name"),
            "email": email,
            "role": "Participant",
        })
        added += 1

    db.commit()

    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "our upcoming event"

    for p in new_participants:
        token_data = {
            "email": p["email"],
            "role": p["role"],
            "name": p["name"],
            "id": p["id"],
        }
        token = create_token(token_data)
        magic_link = f"http://localhost:5173/participant-portal?token={token}"

        subject = f"Welcome to {event_name} — Your Secure Access Link"
        body = (
            f"Hello {p['name']},\n\n"
            f"You have been successfully registered for {event_name}!\n\n"
            "We use a secure, passwordless entry system. Please use your unique magic link "
            "below to access your Hacker Portal, where you can complete your profile, "
            "view your team assignment, and track your progression.\n\n"
            f"Access your portal here:\n{magic_link}\n\n"
            "Do not share this link with anyone, as it is tied directly to your account.\n"
            "Best of luck!"
        )
        background_tasks.add_task(
            _save_and_send,
            db=db,
            to_email=p["email"],
            subject=subject,
            body=body,
            comm_type="WELCOME"
        )

    return {"message": f"{added} participants uploaded and magic links dispatched. {skipped} skipped (already registered)."}


@router.delete("/roster/clear")
def clear_roster(db: Session = Depends(get_db)):
    participant_emails = [p.email for p in db.query(Participant).all()]
    db.query(User).filter(User.email.in_(participant_emails)).delete(synchronize_session=False)
    count = db.query(Participant).count()
    db.query(Participant).delete()
    db.commit()
    log_action(
        db=db,
        action="ROSTER_CLEARED",
        description=f"The entire participant roster was cleared ({count} participants removed).",
        performed_by="committee",
        target_entity="Participant",
        target_id=None
    )
    return {"message": f"All {count} participants deleted successfully"}


@router.delete("/roster/{participant_id}")
def delete_participant(participant_id: int, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    db.query(User).filter(User.email == participant.email).delete()
    db.delete(participant)
    db.commit()
    log_action(
        db=db,
        action="PARTICIPANT_DELETED",
        description=f"Participant '{participant.name}' ({participant.email}) was removed from the roster.",
        performed_by="committee",
        target_entity="Participant",
        target_id=participant_id
    )
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
            "study_year": p.study_year,
            "experience_level": p.experience_level,
            "prior_hackathons": p.prior_hackathons,
            "domain_interest": p.domain_interest,
            "tools_known": p.tools_known,
            "availability": p.availability,
            "role_preference": p.role_preference,
            "tech_stack": p.tech_stack,
            "project_link": p.project_link,
            "resume_link": p.resume_link,
            "source": p.source,
            "registration_status": p.registration_status
        }
        for p in participants
    ]