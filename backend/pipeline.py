from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team, CommunicationLog, EventConfig, Score, Participant
from config import PIPELINE_STAGES, CURRENT_STAGE
from activity import log_action
from gemini import call_gemini
import json
import uuid

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


@router.post("/pipeline/advance")
def advance_pipeline(db: Session = Depends(get_db)):
    # 1. Get active event config
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config:
        raise HTTPException(status_code=400, detail="No active event config found. Please describe your event first.")

    stages = json.loads(config.stages)
    current_index = config.current_stage_index if config.current_stage_index is not None else 0

    if current_index >= len(stages) - 1:
        raise HTTPException(status_code=400, detail="Already at the final stage. Cannot advance further.")

    next_index = current_index + 1
    next_stage = stages[next_index]
    event_name = config.event_name
    scoring_config = json.loads(config.scoring)
    max_score = scoring_config.get("max_score", 10)
    advancement_rule = scoring_config.get("advancement_rule", "Top 50% advance")

    # 2. Get all approved teams and their scores for current round
    approved_teams = db.query(Team).filter(
        Team.status == "APPROVED",
        Team.is_qualified == True
    ).all()

    if not approved_teams:
        raise HTTPException(status_code=400, detail="No approved qualified teams found to advance.")

    # 3. Calculate average scores per team for current round
    team_scores = {}
    for team in approved_teams:
        scores = db.query(Score).filter(
            Score.team_id == team.id,
            Score.round_number == current_index + 1
        ).all()
        avg = sum(s.score for s in scores) / len(scores) if scores else 0.0
        team_scores[team.id] = {"team": team, "avg": round(avg, 2)}

    # 4. Use AI to determine which teams qualify for next round
    teams_data = [{"team_id": tid, "team_name": data["team"].name, "score": data["avg"]} for tid, data in team_scores.items()]

    prompt = f"""You are an AI judging assistant.
The advancement rule for this event is: "{advancement_rule}"
Maximum score possible: {max_score}

Here are the teams and their average scores for this round:
{json.dumps(teams_data, indent=2)}

Based strictly on the advancement rule, which teams qualify for the next round?
Return ONLY a valid JSON array of team_ids (integers). No markdown, no text.
Example: [1, 3, 4]"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        start = raw.find("[")
        end = raw.rfind("]") + 1
        qualified_ids = set(int(x) for x in json.loads(raw[start:end]))
    except Exception as e:
        print(f"AI advancement failed: {e} — falling back to top 50%")
        sorted_teams = sorted(team_scores.items(), key=lambda x: x[1]["avg"], reverse=True)
        cutoff = max(1, len(sorted_teams) // 2)
        qualified_ids = {item[0] for item in sorted_teams[:cutoff]}

    # 5. Mark teams as qualified or eliminated
    for team in approved_teams:
        team.is_qualified = team.id in qualified_ids
    db.commit()

    # 6. Draft emails for committee approval
    batch_id = str(uuid.uuid4())

    # Get next stage task description from AI
    next_stage_task_prompt = f"""You are an event coordinator. The event '{event_name}' is advancing to the next stage: '{next_stage.get('label', next_stage.get('name'))}'.
Write 2-3 sentences describing what participants should prepare or do for this stage. Be specific and practical. No subject line, just the task description."""
    try:
        next_stage_tasks = call_gemini(next_stage_task_prompt).strip()
    except:
        next_stage_tasks = f"Please prepare for the {next_stage.get('label', next_stage.get('name'))} stage."

    drafted_count = 0
    for team in approved_teams:
        member_ids = json.loads(team.member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()

        if team.id in qualified_ids:
            # Qualified email
            for member in members:
                prompt = f"""You are an event coordinator. Write a congratulatory email to a participant who has advanced to the next round.
Event: {event_name}
Participant Name: {member.name}
Team: {team.name}
Next Stage: {next_stage.get('label', next_stage.get('name'))}
Team Score This Round: {team_scores[team.id]['avg']} / {max_score}
What to do next: {next_stage_tasks}

Write a warm, concise email (4-5 sentences). Address them by name, congratulate them, share their score, tell them what the next stage involves and what they need to prepare. No subject line."""
                try:
                    body = call_gemini(prompt)
                except:
                    body = f"Dear {member.name}, congratulations! Your team {team.name} has qualified for the next round. Please prepare for the {next_stage.get('label')} stage."

                subject = f"🎉 You Advanced to {next_stage.get('label', next_stage.get('name'))} | {event_name}"
                log = CommunicationLog(
                    recipient_email=member.email,
                    subject=subject,
                    message=body,
                    comm_type="STAGE_ADVANCE_QUALIFIED",
                    status="PENDING_APPROVAL",
                    batch_id=batch_id
                )
                db.add(log)
                drafted_count += 1
        else:
            # Eliminated email
            for member in members:
                prompt = f"""You are an event coordinator. Write a warm, encouraging email to a participant whose team did not advance to the next round.
Event: {event_name}
Participant Name: {member.name}
Team: {team.name}
Team Score This Round: {team_scores[team.id]['avg']} / {max_score}

Write a kind, motivating email (3-4 sentences). Thank them by name, acknowledge their effort, encourage them to keep building, end positively. No subject line."""
                try:
                    body = call_gemini(prompt)
                except:
                    body = f"Dear {member.name}, thank you for participating in {event_name}. Your team {team.name} gave a great effort this round. We hope to see you at future events!"

                subject = f"Thank You for Participating | {event_name}"
                log = CommunicationLog(
                    recipient_email=member.email,
                    subject=subject,
                    message=body,
                    comm_type="STAGE_ADVANCE_ELIMINATED",
                    status="PENDING_APPROVAL",
                    batch_id=batch_id
                )
                db.add(log)
                drafted_count += 1

    db.commit()

    # 7. Advance stage index
    config.current_stage_index = next_index
    db.commit()

    log_action(
        db=db,
        action="PIPELINE_ADVANCED",
        description=f"Pipeline advanced from stage {current_index + 1} to {next_index + 1}. {len(qualified_ids)} teams qualified, {len(approved_teams) - len(qualified_ids)} eliminated. {drafted_count} emails drafted for approval.",
        performed_by="committee"
    )

    return {
        "message": f"Pipeline advanced to {next_stage.get('label', next_stage.get('name'))}",
        "previous_stage": stages[current_index].get("label"),
        "current_stage": next_stage.get("label"),
        "qualified_teams": len(qualified_ids),
        "eliminated_teams": len(approved_teams) - len(qualified_ids),
        "emails_drafted": drafted_count,
        "batch_id": batch_id,
        "note": "Emails are queued for committee approval. Go to Pending Approvals to review and send."
    }