import requests
import os
from dotenv import load_dotenv

load_dotenv(override=True)

GEMINI_KEYS = [
    os.getenv("GEMINI_API_KEY_1"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4")
]
AVAILABLE_KEYS = [key.strip() for key in GEMINI_KEYS if key and key.strip()]

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("No Groq API key found in .env file.")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1000
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def _hardcoded_fallback(prompt: str) -> str:
    """
    Last resort fallback when ALL AI APIs fail.
    Detects the intent from the prompt and returns a sensible hardcoded response.
    """
    prompt_lower = prompt.lower()

    if "welcome" in prompt_lower and "participant" in prompt_lower:
        return (
            "Dear Participant,\n\n"
            "Welcome to the event! We are thrilled to have you on board. "
            "Your registration has been received and confirmed. "
            "Please watch your inbox for further updates including your team assignment. "
            "We wish you the very best of luck!"
        )

    if "team assignment" in prompt_lower or "assigned team" in prompt_lower:
        return (
            "Dear Participant,\n\n"
            "You have been assigned to your team for this event. "
            "Please connect with your teammates as soon as possible to plan your approach. "
            "We wish your team the very best!"
        )

    if "mentor" in prompt_lower and ("assigned" in prompt_lower or "assignment" in prompt_lower):
        return (
            "Dear Mentor,\n\n"
            "Thank you for being a part of this event as a mentor. "
            "You have been assigned a team to guide throughout the event. "
            "Please reach out to your team at your earliest convenience. "
            "We appreciate your support!"
        )

    if "evaluation" in prompt_lower or "judging" in prompt_lower:
        return (
            "Dear Participant,\n\n"
            "The evaluation round is now starting. "
            "Please ensure your project and presentation are ready. "
            "Judges will be evaluating based on innovation, execution, and impact. "
            "Good luck!"
        )

    if "congratulat" in prompt_lower and ("qualif" in prompt_lower or "advanced" in prompt_lower):
        return (
            "Dear Participant,\n\n"
            "Congratulations! Your team has qualified for the next round. "
            "Please watch your portal for further instructions. "
            "Keep up the excellent work!"
        )

    if "not advance" in prompt_lower or "did not" in prompt_lower or "thank you for participating" in prompt_lower:
        return (
            "Dear Participant,\n\n"
            "Thank you for your participation and hard work at this event. "
            "While your team did not advance to the next round, your effort is truly appreciated. "
            "We hope to see you at future events. Keep building!"
        )

    if "special mention" in prompt_lower and "approved" in prompt_lower:
        return (
            "Dear Participant,\n\n"
            "Congratulations! You have been granted a Special Mention and will compete in the finals. "
            "Your mentor nominated you and the committee has approved your entry. "
            "You will be judged separately for the Special Mention award. Best of luck!"
        )

    if "special mention" in prompt_lower and ("not approved" in prompt_lower or "rejected" in prompt_lower):
        return (
            "Dear Participant,\n\n"
            "Thank you for your incredible effort during the event. "
            "While your Special Mention nomination was not approved this time, "
            "your hard work has not gone unnoticed. Keep building — great things are ahead!"
        )

    if "portal" in prompt_lower and "mentor" in prompt_lower and "link" in prompt_lower:
        return (
            "Dear Mentor,\n\n"
            "Please use the link below to access your Mentor Portal where you can view your assigned team "
            "and submit nominations. This link is personal — please do not share it with anyone."
        )

    if "stage" in prompt_lower and ("starting" in prompt_lower or "active" in prompt_lower):
        return (
            "Dear Participant,\n\n"
            "A new stage of the event is now active. "
            "Please log into your portal and follow the instructions for this stage. "
            "Good luck!"
        )

    if "assessment guide" in prompt_lower or "rubric" in prompt_lower or "evaluate" in prompt_lower:
        return (
            "• Innovation: How original and creative is the solution?\n"
            "• Technical Execution: Is the implementation solid and functional?\n"
            "• Impact: Does the solution address a real problem effectively?\n"
            "• Presentation: Is the idea communicated clearly and confidently?"
        )

    if "rationale" in prompt_lower or "team composition" in prompt_lower:
        return (
            "This team brings together a diverse set of skills that complement each other well. "
            "The combination of technical and creative abilities positions them strongly for the challenges ahead."
        )

    if "mentor" in prompt_lower and "team_id" in prompt_lower:
        return "[]"

    if "advancement" in prompt_lower or "qualify" in prompt_lower:
        return "[]"

    return (
        "Thank you for being part of this event. "
        "Please check your portal or contact the organizers for further information."
    )


def call_gemini(prompt: str) -> str:
    for idx, key in enumerate(AVAILABLE_KEYS):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            print(f"✅ Gemini key #{idx + 1} worked")
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"❌ Gemini key #{idx + 1} failed: {e}")
            continue

    print("⚠️ All Gemini keys exhausted — falling back to Groq")
    try:
        return call_groq(prompt)
    except Exception as e:
        print(f"⚠️ Groq also failed: {e} — falling back to hardcoded algorithm")
        return _hardcoded_fallback(prompt)


# NEW: AI Mentor Rationale Generator
def generate_mentor_rationale(mentor, team, db) -> str:
    from models import Participant
    import json
    
    member_ids = json.loads(team.member_ids) if team.member_ids else []
    members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
    skills = [m.skill for m in members if m.skill]
    
    prompt = f"""You are an event management AI assistant. Write a short rationale (2-3 sentences) explaining why this mentor is a great fit for this specific team.
Mentor Name: {mentor.name}
Mentor Expertise: {mentor.expertise or 'General Management'}
Team Name: {team.name}
Team Skills: {', '.join(skills)}

Explain how the mentor's expertise aligns with or supports the team's combined skillsets."""
    
    rationale = call_gemini(prompt)
    team.mentor_rationale = rationale
    db.commit()
    return rationale