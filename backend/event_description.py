from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
from gemini_parser import parse_event_description

router = APIRouter()

class EventDescriptionRequest(BaseModel):
    description: str

@router.post("/event/describe")
def describe_event(request: EventDescriptionRequest, db: Session = Depends(get_db)):
    if not request.description or len(request.description.strip()) < 20:
        return {
            "status": "incomplete",
            "message": "Description is too short. Please describe your event in more detail."
        }

    parsed = parse_event_description(request.description)

    if not parsed.get("is_complete", False):
        return {
            "status": "incomplete",
            "message": "Event description is missing some critical information",
            "missing_fields": parsed.get("missing_fields", []),
            "parsed_so_far": parsed
        }

    return {
        "status": "complete",
        "message": "Event description parsed successfully",
        "config": parsed
    }
from pydantic import BaseModel
from typing import List, Dict
from gemini import call_gemini
from models import EventConfig
import json

# Request Models for the new routes
class ClarifyRequest(BaseModel):
    description: str
    missing_fields: List[str]

class ResubmitRequest(BaseModel):
    original_description: str
    answers: Dict[str, str]

# ---------------------------------------------------------
# 1. Ask Gemini to generate follow-up questions
# ---------------------------------------------------------
@router.post("/event/clarify")
def clarify_event(request: ClarifyRequest):
    prompt = f"""An event organizer provided this description: '{request.description}'. 
    However, it is missing these critical fields: {request.missing_fields}. 
    Generate exactly one short, polite clarification question for each missing field. 
    Return ONLY a valid JSON array of objects, where each object has a 'question' key. Do not include markdown formatting.
    Example: [{{"question": "How many members should be in a team?"}}]"""
    
    try:
        raw_text = call_gemini(prompt)
        clean_text = raw_text.strip().replace("```json", "").replace("```", "").strip()
        questions = json.loads(clean_text)
        return {"questions": questions}
    except Exception as e:
        print(f"Failed to generate questions: {e}")
        # Fallback questions if AI fails
        return {"questions": [{"question": f"Please provide details for: {field}"} for field in request.missing_fields]}


# ---------------------------------------------------------
# 2. Combine old description + new answers into a final paragraph
# ---------------------------------------------------------
@router.post("/event/clarify/resubmit")
def resubmit_clarification(request: ResubmitRequest):
    prompt = f"""Combine this original event description: '{request.original_description}' 
    with these new clarifications: {request.answers}. 
    Write a single, cohesive, detailed paragraph describing the event. Return ONLY the paragraph text."""
    
    combined = call_gemini(prompt)
    return {"combined_description": combined}


# ---------------------------------------------------------
# 3. Save the final configuration to the database
# ---------------------------------------------------------
# ---------------------------------------------------------
# 3. Save the final configuration to the database
# ---------------------------------------------------------
@router.post("/event/configure")
def configure_event(request: EventDescriptionRequest, db: Session = Depends(get_db)):
    from gemini_parser import parse_event_description
    parsed = parse_event_description(request.description)
    
    db.query(EventConfig).update({"is_active": False})
    
    config = EventConfig(
        event_name=parsed.get("event_name", "Unknown Event"),
        stages=json.dumps(parsed.get("stages", [])), # <-- ADDED THIS
        team_formation=json.dumps(parsed.get("team_formation", {})),
        scoring=json.dumps(parsed.get("scoring", {})),
        communication_touchpoints=json.dumps(parsed.get("communication_touchpoints", [])), # <-- ADDED THIS
        approval_requirements=json.dumps(parsed.get("approval_requirements", [])), # <-- ADDED THIS
        is_active=True
    )
    db.add(config)
    db.commit()
    
    return {"message": "Event configured successfully"}