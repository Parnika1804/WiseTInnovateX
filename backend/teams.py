from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Participant
from pydantic import BaseModel
from typing import List, Optional
import json

router = APIRouter()

class TeamConfig(BaseModel):
    team_size: int
    skill_balance: bool = True
    constraints: Optional[str] = None

class ApproveRequest(BaseModel):
    team_id: int
    action: str

@router.post("/teams/configure")
def configure_teams(config: TeamConfig, db: Session = Depends(get_db)):
    return {
        "message": "Team configuration saved",
        "config": {
            "team_size": config.team_size,
            "skill_balance": config.skill_balance,
            "constraints": config.constraints
        }
    }

@router.post("/teams/generate")
def generate_teams(config: TeamConfig, db: Session = Depends(get_db)):
    participants = db.query(Participant).all()

    if not participants:
        raise HTTPException(status_code=400, detail="No participants found. Upload a roster first.")

    if len(participants) < config.team_size:
        raise HTTPException(status_code=400, detail="Not enough participants to form teams.")

    db.query(Team).delete()
    db.commit()

    if config.skill_balance:
        sorted_participants = sorted(participants, key=lambda p: p.skill)
    else:
        sorted_participants = participants

    teams = []
    team_number = 1

    for i in range(0, len(sorted_participants), config.team_size):
        chunk = sorted_participants[i:i + config.team_size]
        if len(chunk) < config.team_size:
            if teams:
                existing_ids = json.loads(teams[-1].member_ids)
                existing_ids.extend([p.id for p in chunk])
                teams[-1].member_ids = json.dumps(existing_ids)
                db.commit()
                continue

        member_ids = [p.id for p in chunk]
        skills = [p.skill for p in chunk]

        team = Team(
            name=f"Team {team_number}",
            member_ids=json.dumps(member_ids),
            rationale=f"Grouped based on skill balance. Skills in this team: {', '.join(skills)}.",
            status="PENDING"
        )
        db.add(team)
        teams.append(team)
        team_number += 1

    db.commit()

    return {
        "message": f"{len(teams)} teams generated successfully",
        "teams": [
            {
                "id": t.id,
                "name": t.name,
                "member_ids": json.loads(t.member_ids),
                "rationale": t.rationale,
                "status": t.status
            }
            for t in teams
        ]
    }


@router.post("/teams/approve")
def approve_team(request: ApproveRequest, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == request.team_id).first()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if request.action not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Action must be APPROVED or REJECTED")

    team.status = request.action
    db.commit()

    return {
        "message": f"Team {team.name} has been {request.action}",
        "team_id": team.id,
        "status": team.status
    }


@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "member_ids": json.loads(t.member_ids),
            "rationale": t.rationale,
            "status": t.status
        }
        for t in teams
    ]