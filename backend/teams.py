from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Participant, EventConfig
from pydantic import BaseModel
from typing import Optional
from gemini import call_gemini
from tasks import generate_team_rationale
from activity import log_action
import json

router = APIRouter()

class FormationPrompt(BaseModel):
    prompt: str

class ManualConfig(BaseModel):
    team_size: int = 4
    skill_balance: bool = True
    constraints: Optional[str] = None

@router.post("/teams/translate-rubric")
def translate_rubric(request: FormationPrompt):
    """
    Takes a plain English sentence from the Committee and uses Gemini
    to translate it into a strict JSON rubric for team formation.
    """
    system_prompt = f"""You are an AI configuration assistant for a hackathon. 
    The committee will give you a plain English requirement for how teams should be formed.
    You must convert their request into a strict, valid JSON object exactly matching this structure:
    
    {{
      "team_size": (integer, default to 4 if not specified),
      "skill_diversity": (boolean, default to true),
      "same_institution_allowed": (boolean, default to true unless they say otherwise),
      "balance_by": (string array, e.g., ["skill", "experience_level"]),
      "constraints": (string, any specific rule they mentioned, or empty string)
    }}
    
    User Request: "{request.prompt}"
    
    Respond ONLY with the raw JSON object. Do not include markdown tags, backticks, or any conversational text.
    """
    
    try:
        raw_text = call_gemini(system_prompt).strip()
        if "```" in raw_text:
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        return json.loads(raw_text[start:end])
    except Exception as e:
        print(f"Error translating rubric: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse rubric using AI")

@router.post("/teams/generate")
def generate_teams(manual_config: Optional[ManualConfig] = None, db: Session = Depends(get_db)):
    # 1. Determine active configuration
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    
    team_size = 4
    skill_balance = True
    config_source = "manual"
    event_config_id = None

    if config and config.team_formation:
        rules = json.loads(config.team_formation)
        team_size = rules.get("team_size", 4)
        skill_balance = rules.get("skill_balance", True)
        config_source = "dynamic"
        event_config_id = config.id
    elif manual_config:
        team_size = manual_config.team_size
        skill_balance = manual_config.skill_balance

    # 2. Get unassigned, approved participants
    existing_teams = db.query(Team).all()
    assigned_ids = set()
    for t in existing_teams:
        assigned_ids.update(json.loads(t.member_ids))

    available_participants = db.query(Participant).filter(
        Participant.registration_status == 'approved',
        ~Participant.id.in_(assigned_ids)
    ).all()

    if not available_participants:
        raise HTTPException(status_code=400, detail="No unassigned approved participants available to form teams.")

    # 3. Algorithmic Sorting Engine
    formed_teams = []
    if skill_balance:
        # Group by skill for balanced distribution
        skill_buckets = {}
        for p in available_participants:
            skill_buckets.setdefault(p.skill, []).append(p)
        
        while any(skill_buckets.values()):
            current_team = []
            # Pull one from each skill bucket until team is full
            for skill in list(skill_buckets.keys()):
                if len(current_team) >= team_size:
                    break
                if skill_buckets[skill]:
                    current_team.append(skill_buckets[skill].pop(0))
            
            # If team is not full but buckets are running dry, fill with whoever is left
            if len(current_team) < team_size:
                for skill in list(skill_buckets.keys()):
                    while skill_buckets[skill] and len(current_team) < team_size:
                        current_team.append(skill_buckets[skill].pop(0))
            
            if current_team:
                formed_teams.append(current_team)
    else:
        # Simple chunking if diversity isn't requested
        for i in range(0, len(available_participants), team_size):
            formed_teams.append(available_participants[i:i + team_size])

    # 4. Save to DB and trigger asynchronous AI rationale tasks
    created_team_records = []
    base_team_number = db.query(Team).count() + 1

    for idx, team_members in enumerate(formed_teams):
        member_ids = [p.id for p in team_members]
        member_names = [p.name for p in team_members]
        member_skills = [p.skill for p in team_members]
        institutions = [p.institution for p in team_members if p.institution]

        new_team = Team(
            name=f"Team {base_team_number + idx}",
            member_ids=json.dumps(member_ids),
            rationale="AI is generating rationale...",
            status="PENDING",
            event_config_id=event_config_id
        )
        db.add(new_team)
        db.commit()
        db.refresh(new_team)
        created_team_records.append(new_team)

        # Dispatch Celery background task
        generate_team_rationale.delay(
            team_id=new_team.id,
            team_name=new_team.name,
            member_names=member_names,
            member_skills=member_skills,
            institutions=institutions
        )
    return {
        "message": f"{len(created_team_records)} teams generated successfully",
        "config_source": config_source,
        "teams": [
            {
                "id": t.id,
                "name": t.name,
                "member_ids": json.loads(t.member_ids),
                "rationale": t.rationale,
                "status": t.status
            } for t in created_team_records
        ]
    }

class ApproveRejectRequest(BaseModel):
    team_id: int
    action: str

@router.post("/teams/approve")
def approve_reject_team(request: ApproveRejectRequest, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    if request.action not in ["APPROVED", "REJECTED"]: raise HTTPException(status_code=400, detail="Action must be APPROVED or REJECTED")
    
    team.status = request.action
    db.commit()
    
    log_action(
        db=db,
        action=f"TEAM_{request.action}",
        description=f"Team '{team.name}' was {request.action.lower()} by the committee.",
        performed_by="committee",
        target_entity="Team",
        target_id=team.id
    )
    
    # Auto-send team assignment or rejection emails when status changes
    try:
        from email_triggers import _save_and_send
        config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
        event_name = config.event_name if config else "the event"
        
        member_ids = json.loads(team.member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        
        if request.action == "APPROVED":
            member_names = [m.name for m in members]
            member_skills = [m.skill for m in members]

            for member in members:
                prompt = f"""You are an event coordinator. Write a warm and professional team assignment email for a participant.
Event: {event_name}
Team Name: {team.name}
Team Members: {', '.join(member_names)}
Team Skills: {', '.join(member_skills)}

Write a concise welcome email (3-4 sentences) that announces their assignment, lists members, and encourages connection. Do not include a subject line."""
                
                body = call_gemini(prompt)
                subject = f"Your Team Assignment — {team.name} | {event_name}"
                _save_and_send(db, to_email=member.email, subject=subject, body=body, comm_type="TEAM_ASSIGNMENT")
                
        # NEW FIX: Dispatch automated emails to REJECTED teams as well
        elif request.action == "REJECTED":
            for member in members:
                prompt = f"""You are an event coordinator. Write a polite and reassuring email to a hackathon participant informing them that their proposed team was not approved by the committee.
Event: {event_name}
Team Name: {team.name}
Recipient Name: {member.name}

Write a concise email (2-3 sentences) explaining that their team formation was rejected, and they should await re-assignment or further instructions from the organizers. Keep the tone positive and reassuring. Do not include a subject line."""
                
                body = call_gemini(prompt)
                subject = f"Update on Your Team Assignment | {event_name}"
                _save_and_send(db, to_email=member.email, subject=subject, body=body, comm_type="TEAM_REJECTED")
                
    except Exception as e:
        print(f"[TEAM STATUS EMAIL ERROR] {e}")

    return {"message": f"Team {team.name} has been {request.action}", "team_id": team.id, "status": team.status}

@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for t in teams:
        member_ids = json.loads(t.member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        
        # We attach the full profile including the submitted project links here
        result.append({
            "id": t.id,
            "name": t.name,
            "member_ids": member_ids,
            "members": [
                {
                    "id": m.id,
                    "name": m.name,
                    "skill": m.skill,
                    "tech_stack": m.tech_stack,
                    "project_link": m.project_link,
                    "resume_link": m.resume_link
                } for m in members
            ],
            "rationale": t.rationale,
            "status": t.status,
            "event_config_id": t.event_config_id
        })
    return result

@router.delete("/teams/clear")
def clear_teams(db: Session = Depends(get_db)):
    count = db.query(Team).count()
    db.query(Team).delete()
    db.commit()
    return {"message": f"{count} teams cleared successfully"}