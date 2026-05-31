from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Participant, Team, Score, EventConfig
from pydantic import BaseModel
from activity import log_action
import json

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    tech_stack: str
    project_link: str = ""
    resume_link: str = ""

@router.put("/participant/{participant_id}/profile")
def update_profile(participant_id: int, profile: ProfileUpdateRequest, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    participant.tech_stack = profile.tech_stack
    participant.project_link = profile.project_link
    participant.resume_link = profile.resume_link

    db.commit()
    db.refresh(participant)
    return {"message": "Profile updated successfully"}


def _get_current_stage_info(db: Session):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config:
        return {"name": "INTAKE", "label": "Participant Intake"}
    
    stages = json.loads(config.stages)
    idx = config.current_stage_index if config.current_stage_index is not None else 0
    if not stages:
        return {"name": "INTAKE", "label": "Participant Intake"}
        
    idx = min(idx, len(stages) - 1)
    return stages[idx]


def get_participant_data(participant_id: int, db: Session):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant: return None

    # Find team assignment
    teams = db.query(Team).all()
    my_team = None
    for t in teams:
        members = json.loads(t.member_ids)
        if participant_id in members:
            my_team = t
            break

    team_members = []
    if my_team:
        member_ids = json.loads(my_team.member_ids)
        team_members_db = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        team_members = [{"name": m.name, "skill": m.skill} for m in team_members_db]

    # Calculate Scores and Progression
    is_qualified = False
    avg_score = 0.0
    if my_team:
        scores = db.query(Score).filter(Score.team_id == my_team.id).all()
        if scores:
            avg_score = sum([s.score for s in scores]) / len(scores)
            # MVP Rule: Teams averaging 6.0 or higher advance to the next round
            is_qualified = avg_score >= 6.0

    current_stage = _get_current_stage_info(db)

    return {
        "participant": {
            "id": participant.id,
            "name": participant.name,
            "email": participant.email,
            "skill": participant.skill,
            "institution": participant.institution,
            "registration_status": participant.registration_status
        },
        # THE FIX: Added my_team.status so the frontend knows if it was rejected
        "team": {"id": my_team.id, "name": my_team.name, "status": my_team.status} if my_team else None,
        "team_members": team_members,
        "current_stage": current_stage,
        "progression": {
            "is_qualified": is_qualified,
            "average_score": avg_score,
            "message": "Congratulations! You have scored high enough to advance to the next phase." if is_qualified else "Results are currently being processed."
        }
    }


@router.get("/participant/me/{email}")
def get_participant_by_email(email: str, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.email == email).first()
    if not participant:
        return {
            "status": "not_found",
            "message": "No participant profile found for this email"
        }
    
    data = get_participant_data(participant.id, db)
    return data


@router.post("/participant/{participant_id}/confirm")
def confirm_progression(participant_id: int, db: Session = Depends(get_db)):
    from activity import log_action
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Securely log the confirmation in the system's audit trail
    log_action(
        db, 
        action="PROGRESSION_ACCEPTED", 
        description=f"Participant {participant.name} confirmed their spot in the next round.", 
        performed_by=participant.name
    )
    log_action(
    db=db,
    action="PARTICIPANTS_UPLOADED",
    description="Committee uploaded a new participant roster via CSV",
    performed_by="committee",
    target_entity="Participant",
    target_id=None 
    )

    return {"message": "Progression confirmed successfully. See you in the next round!"}