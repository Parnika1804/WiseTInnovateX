from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import SpecialMention, Mentor, Team, Participant, EventConfig
from pydantic import BaseModel
from typing import List, Optional
import json
from websocket_manager import manager

router = APIRouter()


class NominateRequest(BaseModel):
    mentor_id: int
    team_id: int
    nominated_member_ids: List[int]
    reason: str


class ApproveRequest(BaseModel):
    nomination_id: int
    action: str  # APPROVED or REJECTED
    reviewed_by: str


@router.post("/special-mention/nominate")
def nominate(request: NominateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if len(request.nominated_member_ids) != 1:
        raise HTTPException(status_code=400, detail="You must nominate exactly one member.")

    mentor = db.query(Mentor).filter(Mentor.id == request.mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.is_qualified:
        raise HTTPException(status_code=400, detail="Team is still qualified. Only eliminated teams can be nominated.")

    if mentor.assigned_team_id != request.team_id:
        raise HTTPException(status_code=403, detail="You can only nominate members from your assigned team.")

    existing = db.query(SpecialMention).filter(SpecialMention.team_id == request.team_id).first()
    if existing:
        if existing.status in ["PENDING", "APPROVED"]:
            raise HTTPException(status_code=400, detail="A nomination already exists for this team.")
        # If REJECTED, delete it and allow fresh nomination
        db.delete(existing)
        db.commit()

    nomination = SpecialMention(
        team_id=request.team_id,
        mentor_id=request.mentor_id,
        nominated_member_ids=json.dumps(request.nominated_member_ids),
        reason=request.reason,
        status="PENDING"
    )
    db.add(nomination)
    db.commit()
    db.refresh(nomination)

    try:
        from email_triggers import send_special_mention_nomination_email
        send_special_mention_nomination_email(db, nomination)
    except Exception as e:
        print(f"[SPECIAL MENTION NOMINATION EMAIL ERROR] {e}")

    # Broadcast to the dashboard to auto-refresh the Action Center
    background_tasks.add_task(manager.broadcast_to_channel, "dashboard", {"event": "dashboard_updated"})

    return {"message": "Nomination submitted successfully", "nomination_id": nomination.id}


@router.get("/special-mention")
def get_nominations(db: Session = Depends(get_db)):
    nominations = db.query(SpecialMention).all()
    result = []
    for n in nominations:
        team = db.query(Team).filter(Team.id == n.team_id).first()
        mentor = db.query(Mentor).filter(Mentor.id == n.mentor_id).first()
        member_ids = json.loads(n.nominated_member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()

        result.append({
            "id": n.id,
            "team_id": n.team_id,
            "team_name": team.name if team else None,
            "mentor_id": n.mentor_id,
            "mentor_name": mentor.name if mentor else None,
            "mentor_reason": n.reason,
            "nominated_members": [{"id": m.id, "name": m.name, "skill": m.skill, "email": m.email} for m in members],
            "nominated_member_ids": member_ids,
            "status": n.status,
            "reviewed_by": n.reviewed_by,
            "created_at": n.created_at
        })
    return result


@router.post("/special-mention/approve")
def approve_nomination(request: ApproveRequest, db: Session = Depends(get_db)):
    nomination = db.query(SpecialMention).filter(SpecialMention.id == request.nomination_id).first()
    if not nomination:
        raise HTTPException(status_code=404, detail="Nomination not found")
    if request.action not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Action must be APPROVED or REJECTED")

    # FIX: Validate that we're in the final round before allowing approval.
    # SM nominees compete in the final round — approving in an earlier round is wrong.
    if request.action == "APPROVED":
        config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
        if config:
            scoring_data = json.loads(config.scoring)
            current_round = scoring_data.get("current_round", 1)
            advancement_rules = scoring_data.get("advancement_rules", [])

            is_final_round = False
            if advancement_rules and len(advancement_rules) >= current_round:
                rule_str = advancement_rules[current_round - 1].get("rule", "").lower()
                if "final" in rule_str or current_round >= len(advancement_rules):
                    is_final_round = True
            else:
                # No advancement rules defined — treat as final
                is_final_round = True

            if not is_final_round:
                raise HTTPException(
                    status_code=400,
                    detail=f"Special Mention nominations can only be approved in the final round. Currently in Round {current_round}."
                )

    nomination.status = request.action
    nomination.reviewed_by = request.reviewed_by

    # Mark the team as special mention so judges can score them separately
    if request.action == "APPROVED":
        team = db.query(Team).filter(Team.id == nomination.team_id).first()
        if team:
            team.is_special_mention = True

    elif request.action == "REJECTED":
        # If previously approved then rejected, clear the flag
        team = db.query(Team).filter(Team.id == nomination.team_id).first()
        if team:
            team.is_special_mention = False

    db.commit()

    try:
        from email_triggers import send_special_mention_decision_emails
        send_special_mention_decision_emails(db, nomination, approved=(request.action == "APPROVED"))
    except Exception as e:
        print(f"[SPECIAL MENTION DECISION EMAIL ERROR] {e}")

    return {
        "message": f"Nomination {request.action.lower()} successfully",
        "nomination_id": nomination.id,
        "status": nomination.status
    }


@router.get("/special-mention/approved")
def get_approved_nominations(db: Session = Depends(get_db)):
    nominations = db.query(SpecialMention).filter(SpecialMention.status == "APPROVED").all()
    result = []
    for n in nominations:
        team = db.query(Team).filter(Team.id == n.team_id).first()
        member_ids = json.loads(n.nominated_member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        result.append({
            "nomination_id": n.id,
            "team_id": n.team_id,
            "team_name": team.name if team else None,
            "is_special_mention": team.is_special_mention if team else False,
            "nominated_members": [{"id": m.id, "name": m.name, "skill": m.skill} for m in members],
            "reason": n.reason
        })
    return result