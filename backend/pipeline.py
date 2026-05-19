from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Team, CommunicationLog
from config import PIPELINE_STAGES, CURRENT_STAGE

router = APIRouter()

@router.get("/pipeline/status")
def get_pipeline_status(db: Session = Depends(get_db)):
    pending_teams = db.query(Team).filter(Team.status == "PENDING").count()
    pending_comms = db.query(CommunicationLog).filter(CommunicationLog.status == "DRAFT").count()

    current_index = next(
        (i for i, s in enumerate(PIPELINE_STAGES) if s["name"] == CURRENT_STAGE), 0
    )

    stages_with_status = []
    for i, stage in enumerate(PIPELINE_STAGES):
        if i < current_index:
            status = "COMPLETED"
        elif i == current_index:
            status = "ACTIVE"
        else:
            status = "UPCOMING"

        stages_with_status.append({
            "order": stage["order"],
            "name": stage["name"],
            "label": stage["label"],
            "description": stage["description"],
            "status": status
        })

    pending_items = []

    if pending_teams > 0:
        pending_items.append({
            "type": "TEAM_APPROVAL",
            "message": f"{pending_teams} team(s) awaiting committee approval",
            "count": pending_teams
        })

    if pending_comms > 0:
        pending_items.append({
            "type": "COMMUNICATION",
            "message": f"{pending_comms} draft communication(s) not yet sent",
            "count": pending_comms
        })

    return {
        "current_stage": CURRENT_STAGE,
        "stages": stages_with_status,
        "pending_items": pending_items
    }