from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Participant, EventConfig
from pydantic import BaseModel
from typing import Optional
from gemini import call_gemini
import json

router = APIRouter()
class FormationPrompt(BaseModel):
    prompt: str

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
        # Call your existing Gemini setup
        raw_response = call_gemini(system_prompt)
        
        # Clean the response in case Gemini includes markdown like ```json
        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
            
        json_rubric = json.loads(cleaned.strip())
        return json_rubric
        
    except Exception as e:
        # Fallback to a safe default if the AI fails
        print(f"AI parsing failed: {e}")
        return {
            "team_size": 4,
            "skill_diversity": True,
            "same_institution_allowed": True,
            "balance_by": ["skill"],
            "constraints": ""
        }

from typing import Optional, List

class TeamConfig(BaseModel):
    team_size: int = 4
    skill_diversity: bool = True
    same_institution_allowed: bool = True
    balance_by: Optional[List[str]] = None
    constraints: Optional[str] = None

class ApproveRequest(BaseModel):
    team_id: int
    action: str

def get_dynamic_team_config(db: Session):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if config:
        team_formation = json.loads(config.team_formation)
        return team_formation
    return None

def calculate_participant_weight(p: Participant):
    """Assigns a numeric weight for advanced sorting and balancing"""
    weight = 0
    # Add weight for study year
    if p.study_year:
        year_str = p.study_year.lower()
        if "4" in year_str or "senior" in year_str: weight += 3
        elif "3" in year_str or "junior" in year_str: weight += 2
        elif "2" in year_str or "sophomore" in year_str: weight += 1
    
    # Add weight for experience
    if p.experience_level:
        exp_str = p.experience_level.lower()
        if "expert" in exp_str or "advanced" in exp_str: weight += 3
        elif "intermediate" in exp_str: weight += 2
        
    return weight

@router.post("/teams/configure")
def configure_teams(config: TeamConfig, db: Session = Depends(get_db)):
    return {
        "message": "Team configuration saved",
        "config": {
            "team_size": config.team_size,
            "skill_balance":config.skill_diversity,
            "constraints": config.constraints
        }
    }

@router.post("/teams/generate")
def generate_teams(config: Optional[TeamConfig] = None, db: Session = Depends(get_db)):
    # 1. PRIORITY: Always use the AI Rubric from the UI if it exists!
    if config:
        team_size = config.team_size
        skill_balance = config.skill_diversity
        constraints = config.constraints
    # 2. FALLBACK: Use the saved dashboard config
    else:
        dynamic_config = get_dynamic_team_config(db)
        if dynamic_config:
            team_size = dynamic_config.get("team_size", 4)
            # Safely check for both old and new naming conventions
            skill_balance = dynamic_config.get("skill_diversity", dynamic_config.get("skill_balance", True))
            constraints = dynamic_config.get("constraints", None)
        else:
            raise HTTPException(status_code=400, detail="No team config found.")

    participants = db.query(Participant).all()

    if not participants:
        raise HTTPException(status_code=400, detail="No participants found. Upload a roster first.")

    if len(participants) < team_size:
        raise HTTPException(status_code=400, detail="Not enough participants to form teams.")

    db.query(Team).delete()
    db.commit()

    # ADVANCED SORTING
    if skill_balance:
        sorted_participants = sorted(participants, key=calculate_participant_weight)
    else:
        sorted_participants = participants

    teams = []
    team_number = 1

    # SNAKE DRAFT (Safeguarded against division by zero)
    num_teams = max(1, len(sorted_participants) // team_size)
    team_buckets = [[] for _ in range(num_teams)]
    
    for i, p in enumerate(sorted_participants):
        bucket_index = i % num_teams
        if (i // num_teams) % 2 != 0:
            bucket_index = num_teams - 1 - bucket_index
        
        if bucket_index >= len(team_buckets): 
            team_buckets[-1].append(p)
        else:
            team_buckets[bucket_index].append(p)

    for chunk in team_buckets:
        if not chunk: continue
        
        member_ids = [p.id for p in chunk]
        
        member_profiles = []
        for p in chunk:
            profile = f"{p.name} ({p.skill}, {p.study_year or 'Unknown Year'}, {p.experience_level or 'Unknown Exp'})"
            if p.domain_interest: profile += f" - Interest: {p.domain_interest}"
            if p.role_preference: profile += f" - Prefers: {p.role_preference}"
            member_profiles.append(profile)

        # GEMINI RATIONALE PROMPT
        prompt = f"""You are an expert event organizer AI for a hackathon. A team has been formed with the following members:
{chr(10).join(member_profiles)}

Write a concise, 3-sentence rationale explaining why this is a highly effective and balanced team composition. 
Focus specifically on how their different experience levels, study years, domain interests, and role preferences complement each other to build a strong product."""

        rationale = call_gemini(prompt)

        team = Team(
            name=f"Team {team_number}",
            member_ids=json.dumps(member_ids),
            rationale=rationale,
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
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    if request.action not in ["APPROVED", "REJECTED"]: raise HTTPException(status_code=400, detail="Action must be APPROVED or REJECTED")
    team.status = request.action
    db.commit()
    return {"message": f"Team {team.name} has been {request.action}", "team_id": team.id, "status": team.status}

@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    return [{"id": t.id, "name": t.name, "member_ids": json.loads(t.member_ids), "rationale": t.rationale, "status": t.status} for t in teams]