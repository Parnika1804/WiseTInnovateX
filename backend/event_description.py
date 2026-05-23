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