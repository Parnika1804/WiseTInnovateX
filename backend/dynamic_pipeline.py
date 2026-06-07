from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import EventConfig, Team, Score, CommunicationLog, Participant, ActivityLog, User
from pydantic import BaseModel
from datetime import datetime
from gemini_parser import parse_event_description
import json
from typing import List


router = APIRouter()

class SaveConfigRequest(BaseModel):
    description: str

class RoundRule(BaseModel):
    round: int
    stage_name: str
    rule: str  # e.g. "top 50%", "top 3 teams", "top 70%"

class AdvancementRulesRequest(BaseModel):
    rules: List[RoundRule]


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
        db.query(Team).filter(Team.event_config_id == e.id).delete()
    db.commit()

    config = EventConfig(
        event_name=parsed["event_name"],
        stages=json.dumps(parsed["stages"]),
        team_formation=json.dumps(parsed["team_formation"]),
        scoring=json.dumps(parsed["scoring"]),
        communication_touchpoints=json.dumps(parsed["communication_touchpoints"]),
        approval_requirements=json.dumps(parsed["approval_requirements"]),
        is_active=True,
        current_stage_index=0,
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    return {
        "status": "saved",
        "message": f"Event config saved successfully for {parsed['event_name']}",
        "config_id": config.id,
        "config": parsed,
        "next_step": "set_advancement_rules"
    }


@router.patch("/event/config/advancement-rules")
def save_advancement_rules(request: AdvancementRulesRequest, db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config:
        raise HTTPException(status_code=404, detail="No active event config found.")

    scoring = json.loads(config.scoring)
    scoring["advancement_rules"] = [
        {"round": r.round, "stage_name": r.stage_name, "rule": r.rule}
        for r in request.rules
    ]
    config.scoring = json.dumps(scoring)
    db.commit()

    return {
        "status": "saved",
        "message": "Per-round advancement rules saved successfully.",
        "advancement_rules": scoring["advancement_rules"]
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
            "current_stage_index": config.current_stage_index,
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

    if not stages:
        return {
            "status": "not_configured",
            "message": "Event configuration is incomplete due to a previous AI generation error. Please re-configure your event."
        }

    current_index = config.current_stage_index if config.current_stage_index is not None else 0
    current_index = min(current_index, len(stages) - 1)

    stages_with_status = []
    for i, stage in enumerate(stages):
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

    current_stage = stages[current_index]

    return {
        "event_name": config.event_name,
        "current_stage": current_stage["name"],
        "current_stage_index": current_index,
        "total_stages": len(stages),
        "is_final_stage": current_index >= len(stages) - 1,
        "stages": stages_with_status,
        "team_formation": json.loads(config.team_formation),
        "scoring": json.loads(config.scoring)
    }


@router.post("/pipeline/advance")
def advance_pipeline_stage(db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()

    if not config:
        raise HTTPException(status_code=404, detail="No active event config found.")

    stages = json.loads(config.stages)
    current_index = config.current_stage_index if config.current_stage_index is not None else 0

    if current_index >= len(stages) - 1:
        raise HTTPException(status_code=400, detail="Already at the final stage. Cannot advance further.")

    prev_stage_name = stages[current_index]["name"]
    config.current_stage_index = current_index + 1
    next_stage_name = stages[config.current_stage_index]["name"]
    db.commit()

    try:
        from email_triggers import trigger_stage_emails
        trigger_result = trigger_stage_emails(next_stage_name, db)
    except Exception as e:
        trigger_result = {"triggered": False, "error": str(e)}

    return {
        "message": f"Pipeline advanced: '{prev_stage_name}' → '{next_stage_name}'",
        "previous_stage": prev_stage_name,
        "current_stage": next_stage_name,
        "current_stage_index": config.current_stage_index,
        "email_trigger": trigger_result
    }


@router.post("/pipeline/reset")
def reset_pipeline_stage(db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()

    if not config:
        raise HTTPException(status_code=404, detail="No active event config found.")

    config.current_stage_index = 0
    db.commit()

    stages = json.loads(config.stages)
    return {
        "message": "Pipeline reset to the first stage.",
        "current_stage": stages[0]["name"] if stages else None,
        "current_stage_index": 0
    }


@router.delete("/system/reset")
def reset_system(db: Session = Depends(get_db)):
    try:
        db.query(Score).delete()
        db.query(CommunicationLog).delete()
        db.query(Team).delete()
        db.query(Participant).delete()
        db.query(ActivityLog).delete()
        db.query(EventConfig).delete()

        db.query(User).filter(User.role == "Judge").delete()

        from activity import log_action
        log_action(
            db,
            action="SYSTEM_RESET",
            description="The committee triggered a hard factory reset to start a new event. All previous data and judges were wiped.",
            performed_by="committee"
        )

        db.commit()
        return {"message": "System successfully reset for a new event. All old data and judges cleared."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")