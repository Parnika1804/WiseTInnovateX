from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
from gemini import call_gemini
import json

router = APIRouter()

class ClarificationRequest(BaseModel):
    description: str
    missing_fields: list

@router.post("/event/clarify")
def get_clarification_questions(request: ClarificationRequest, db: Session = Depends(get_db)):

    prompt = f"""You are an event management AI. A committee has described their event but some critical information is missing.

Event Description provided so far:
{request.description}

Missing fields detected:
{', '.join(request.missing_fields)}

Generate specific follow-up questions to ask the committee to fill in the missing information.
Return ONLY a valid JSON object — no extra text, no markdown, no backticks:
{{
  "questions": [
    {{
      "field": "the missing field name",
      "question": "specific question to ask the committee"
    }}
  ],
  "message": "short friendly message telling committee what info is needed"
}}"""

    try:
        raw_text = call_gemini(prompt)

        clean_text = raw_text.strip()

        if "```" in clean_text:
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]

        clean_text = clean_text.strip()

        start = clean_text.find("{")
        end = clean_text.rfind("}") + 1
        if start != -1 and end != 0:
            clean_text = clean_text[start:end]

        parsed = json.loads(clean_text)

        return {
            "status": "clarification_needed",
            "message": parsed.get("message", "Please answer the following questions to complete your event setup"),
            "questions": parsed.get("questions", [])
        }

    except Exception as e:
        print(f"Clarification error: {e}")
        return {
            "status": "clarification_needed",
            "message": "Please provide more details about your event",
            "questions": [
                {"field": f, "question": f"Please provide details about: {f}"}
                for f in request.missing_fields
            ]
        }


@router.post("/event/clarify/resubmit")
def resubmit_with_clarification(request: dict, db: Session = Depends(get_db)):
    original_description = request.get("original_description", "")
    answers = request.get("answers", {})

    combined = original_description + "\n\nAdditional details:\n"
    for field, answer in answers.items():
        combined += f"- {field}: {answer}\n"

    return {
        "status": "ready",
        "message": "Description updated with your answers. Please resubmit to POST /event/configure",
        "combined_description": combined
    }