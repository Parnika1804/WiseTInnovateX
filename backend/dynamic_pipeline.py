from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import EventConfig
from pydantic import BaseModel
from datetime import datetime
from gemini_parser import parse_event_description
import json

router = APIRouter()

class SaveConfigRequest(BaseModel):
    description: str


@router.post("/event/configure")
def configure_event(request: SaveConfigRequest, db: Session = Depends(get_db)):
    parsed = parse_event_description(request.description)

    if not parsed.get("is_complete", False):
        return {
            "status": "incomplete",
            "message": "Event description is missing critical information",
            "missing_fields": parsed.get("missing_fields", []),
            "parsed_so_far": parsed
        }

    existing = db.query(EventConfig).filter(EventConfig.is_active == True).all()
    for e in existing:
        e.is_active = False
    db.commit()

    config = EventConfig(
        event_name=parsed["event_name"],
        stages=json.dumps(parsed["stages"]),
        team_formation=json.dumps(parsed["team_formation"]),
        scoring=json.dumps(parsed["scoring"]),
        communication_touchpoints=json.dumps(parsed["communication_touchpoints"]),
        approval_requirements=json.dumps(parsed["approval_requirements"]),
        is_active=True
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    return {
        "status": "saved",
        "message": f"Event config saved successfully for {parsed['event_name']}",
        "config_id": config.id,
        "config": parsed
    }


@router.get("/event/config")
def get_active_config(db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()

    if not config:
        return {
            "status": "not_found",
            "message": "No active event config found. Please describe your event first."
        }

    return {
        "status": "found",
        "config": {
            "id": config.id,
            "event_name": config.event_name,
            "stages": json.loads(config.stages),
            "team_formation": json.loads(config.team_formation),
            "scoring": json.loads(config.scoring),
            "communication_touchpoints": json.loads(config.communication_touchpoints),
            "approval_requirements": json.loads(config.approval_requirements),
            "created_at": config.created_at
        }
    }


@router.get("/pipeline/dynamic/status")
def get_dynamic_pipeline_status(db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()

    if not config:
        return {
            "status": "not_configured",
            "message": "No event config found. Please describe your event first."
        }

    stages = json.loads(config.stages)

    stages_with_status = []
    for i, stage in enumerate(stages):
        if i == 0:
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

    return {
        "event_name": config.event_name,
        "current_stage": stages[0]["name"] if stages else None,
        "stages": stages_with_status,
        "team_formation": json.loads(config.team_formation),
        "scoring": json.loads(config.scoring)
    }