from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Participant, Team, Score
from pydantic import BaseModel
from config import PIPELINE_STAGES, CURRENT_STAGE
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


def get_participant_data(participant_id: int, db: Session):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()

    if not participant:
        return None

    participant_team = None
    team_members = []

    all_teams = db.query(Team).all()
    for team in all_teams:
        member_ids = json.loads(team.member_ids)
        if participant_id in member_ids:
            participant_team = team
            for mid in member_ids:
                member = db.query(Participant).filter(Participant.id == mid).first()
                if member:
                    team_members.append({
                        "id": member.id,
                        "name": member.name,
                        "skill": member.skill
                    })
            break

    current_index = next(
        (i for i, s in enumerate(PIPELINE_STAGES) if s["name"] == CURRENT_STAGE), 0
    )
    current_stage_info = PIPELINE_STAGES[current_index]

    evaluator = None
    is_qualified = False

    if participant_team:
        scores = db.query(Score).filter(Score.team_id == participant_team.id).all()
        if scores:
            evaluator = scores[0].judge_name
            average = sum(s.score for s in scores) / len(scores)
            is_qualified = average >= 7.0

    return {
        "participant": {
            "id": participant.id,
            "name": participant.name,
            "email": participant.email,
            "skill": participant.skill,
            "institution": participant.institution
        },
        "current_stage": {
            "name": current_stage_info["name"],
            "label": current_stage_info["label"],
            "description": current_stage_info["description"]
        },
        "team": {
            "id": participant_team.id if participant_team else None,
            "name": participant_team.name if participant_team else None,
            "status": participant_team.status if participant_team else None,
            "members": team_members
        } if participant_team else None,
        "evaluator": evaluator,
        "key_dates": {
            "event_start": "2026-06-01",
            "team_announcement": "2026-06-02",
            "evaluation_date": "2026-06-03",
            "results_date": "2026-06-04"
        },
        "progression": {
            "is_qualified": is_qualified,
            "message": "Congratulations! You have been invited to the next round." if is_qualified else "Results are being processed."
        }
    }


@router.get("/participant/{participant_id}")
def get_participant_status(participant_id: int, db: Session = Depends(get_db)):
    data = get_participant_data(participant_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Participant not found")
    return data


@router.get("/participant/me/{email}")
def get_participant_by_email(email: str, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.email == email).first()
    if not participant:
        return {
            "status": "not_found",
            "message": "No participant profile found for this email"
        }
    return get_participant_data(participant.id, db)


@router.get("/participants/portal")
def get_all_participant_portals(db: Session = Depends(get_db)):
    participants = db.query(Participant).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "skill": p.skill,
            "institution": p.institution
        }
        for p in participants
    ]