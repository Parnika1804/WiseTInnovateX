from celery_app import celery_app
from gemini import call_gemini
import json

@celery_app.task(name="generate_team_rationale")
def generate_team_rationale(team_name: str, member_names: list, member_skills: list, institutions: list) -> str:
    prompt = f"""You are an event organizer AI. A team has been formed with the following members:
Names: {', '.join(member_names)}
Skills: {', '.join(member_skills)}
Institutions: {', '.join(institutions)}

Write a 2-3 sentence rationale explaining why this is a good team composition for a hackathon. Be specific about the skills and diversity."""

    return call_gemini(prompt)


@celery_app.task(name="draft_communication")
def draft_communication(stage: str, recipient_email: str, team_name: str = None, member_names: list = None, member_skills: list = None) -> dict:
    if stage == "TEAM_ASSIGNMENT":
        prompt = f"""You are an event coordinator. Write a warm and professional team assignment email for a hackathon participant.

Team Name: {team_name}
Team Members: {', '.join(member_names)}
Team Skills: {', '.join(member_skills)}
Recipient Email: {recipient_email}

Write a concise welcome email (3-4 sentences) that:
- Announces their team assignment
- Lists their team members and skills
- Encourages them to connect with teammates
- Mentions the hackathon is starting soon

Do not include subject line, just the email body."""

        subject = f"Your Team Assignment — {team_name}"

    elif stage == "EVALUATION_REMINDER":
        prompt = f"""You are an event coordinator. Write a professional evaluation reminder email for a hackathon participant.

Recipient Email: {recipient_email}

Write a concise reminder email (3-4 sentences) that:
- Reminds them evaluation is coming up soon
- Encourages them to prepare their presentation
- Mentions judges will be evaluating based on innovation, execution and impact
- Wishes them good luck

Do not include subject line, just the email body."""

        subject = "Evaluation Reminder — Hackathon"

    else:
        return {"error": "Invalid stage"}

    message = call_gemini(prompt)
    return {
        "subject": subject,
        "message": message,
        "recipient_email": recipient_email,
        "stage": stage
    }


@celery_app.task(name="generate_assessment_guide")
def generate_assessment_guide(team_name: str, member_names: list, member_skills: list) -> str:
    prompt = f"""You are an expert hackathon judge. Generate a structured assessment guide for evaluating the following team.

Team Name: {team_name}
Team Members: {', '.join(member_names)}
Team Skills: {', '.join(member_skills)}

Generate a concise assessment guide with the following sections:
1. Key evaluation criteria (3-4 points based on their skills)
2. What to look for in their presentation
3. Scoring breakdown suggestion (out of 10)

Keep it practical and specific to this team's skill set."""

    return call_gemini(prompt)