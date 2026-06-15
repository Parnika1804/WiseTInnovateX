from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import EventConfig, Team, Score, CommunicationLog, Participant, ActivityLog, User, Mentor
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
    rule: str

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


def _compute_pipeline_status(config, db: Session) -> dict:
    """
    Purely visual pipeline status computed from real DB data.
    No triggers, no emails, no side effects.
    
    Rules:
    - Registration: COMPLETED if any participants exist, else UPCOMING
    - Team Formation: COMPLETED if any team is APPROVED, ACTIVE if teams exist but none approved, else UPCOMING
    - Evaluation rounds: COMPLETED if scores exist for that round AND round has been finalized (current_round > that round), ACTIVE if current round matches, else UPCOMING
    - Results: COMPLETED if EVALUATION_FINALIZED activity log exists, ACTIVE if all rounds done, else UPCOMING
    """
    stages = json.loads(config.stages)
    if not stages:
        return None

    scoring_data = json.loads(config.scoring) if config.scoring else {}
    current_round = scoring_data.get("current_round", 1)

    # DB checks
    participant_count = db.query(Participant).filter(Participant.registration_status == 'approved').count()
    all_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_teams = all_teams
    
    results_finalized = db.query(ActivityLog).filter(
        ActivityLog.action == "EVALUATION_FINALIZED"
    ).first() is not None

    # Count scores per round
    def has_scores_for_round(round_num):
        return db.query(Score).filter(Score.round_number == round_num).count() > 0

    # Track evaluation round counter as we walk through stages
    eval_round_counter = 0
    stages_with_status = []

    for i, stage in enumerate(stages):
        label = stage.get("label", "").lower()
        name = stage.get("name", "").lower()
        import sys
        print(f"STAGE: {label}, participant_count={participant_count}", flush=True, file=sys.stderr)

        is_registration = "registr" in label or "registr" in name
        is_team = "team" in label or "team" in name
        is_result = "result" in label or "result" in name or "final" in label or "winner" in label
        is_evaluation = (
            "eval" in label or "eval" in name or
            "judg" in label or "judg" in name or
            "round" in label or "round" in name or
            "assess" in label or "assess" in name
        ) and not is_result

        if is_registration:
            print(f"DEBUG participant_count={participant_count}")
            if participant_count > 0:
                status = "COMPLETED"
            else:
                status = "UPCOMING"

        elif is_team:
            if len(approved_teams) > 0:
                status = "COMPLETED"
            elif len(all_teams) > 0:
                status = "ACTIVE"
            else:
                status = "UPCOMING"

        elif is_evaluation:
            eval_round_counter += 1
            round_num = eval_round_counter
            round_has_scores = has_scores_for_round(round_num)

            if results_finalized:
                # All evaluation rounds done
                status = "COMPLETED"
            elif current_round > round_num and round_has_scores:
                # This round was finalized, next round is active
                status = "COMPLETED"
            elif current_round == round_num and round_has_scores:
                # Scores submitted for this round, not yet finalized
                status = "ACTIVE"
            elif current_round == round_num and len(approved_teams) > 0:
                # Round is active but no scores yet
                status = "ACTIVE"
            else:
                status = "UPCOMING"

        elif is_result:
            if results_finalized:
                status = "COMPLETED"
            elif current_round > len([s for s in stages if "eval" in s.get("label","").lower() or "round" in s.get("label","").lower()]):
                status = "ACTIVE"
            else:
                status = "UPCOMING"

        else:
            # Generic stage — use position relative to current_round as proxy
            status = "UPCOMING"

        stages_with_status.append({
            "order": stage["order"],
            "name": stage["name"],
            "label": stage["label"],
            "description": stage.get("description", ""),
            "status": status
        })

    # Determine current stage label for header
    active_stages = [s for s in stages_with_status if s["status"] == "ACTIVE"]
    current_stage_name = active_stages[0]["name"] if active_stages else stages_with_status[-1]["name"]
    current_stage_index = next(
        (i for i, s in enumerate(stages_with_status) if s["status"] == "ACTIVE"),
        len(stages_with_status) - 1
    )

    return {
        "event_name": config.event_name,
        "current_stage": current_stage_name,
        "current_stage_index": current_stage_index,
        "total_stages": len(stages),
        "is_final_stage": results_finalized,
        "stages": stages_with_status,
        "team_formation": json.loads(config.team_formation),
        "scoring": scoring_data
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

    result = _compute_pipeline_status(config, db)
    return result


@router.post("/pipeline/advance")
def advance_pipeline_stage(db: Session = Depends(get_db)):
    """
    Kept for compatibility but no longer drives visual state.
    Visual state is computed purely from DB data now.
    """
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

    return {
        "message": f"Pipeline advanced: '{prev_stage_name}' → '{next_stage_name}'",
        "previous_stage": prev_stage_name,
        "current_stage": next_stage_name,
        "current_stage_index": config.current_stage_index,
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
        db.query(Mentor).delete()
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