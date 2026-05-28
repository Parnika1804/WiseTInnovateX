"""
email_triggers.py
Auto-email helpers called by roster, teams, scores, and pipeline routers.
Each function drafts an email via Gemini, saves it to CommunicationLog, and
fires it via SendGrid.
"""

from sqlalchemy.orm import Session
from models import CommunicationLog, Participant, Team, EventConfig
from email_service import send_email
from gemini import call_gemini
from datetime import datetime
import json


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _save_and_send(
    db: Session,
    to_email: str,
    subject: str,
    body: str,
    comm_type: str = "AUTO",
) -> CommunicationLog:
    """Persist a CommunicationLog entry and fire the email immediately."""
    log = CommunicationLog(
        recipient_email=to_email,
        subject=subject,
        message=body,
        comm_type=comm_type,
        status="SENT",
        sent_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    send_email(to_email, subject, body)
    return log


# ---------------------------------------------------------------------------
# 1. Welcome email — fired when committee uploads CSV
# ---------------------------------------------------------------------------

def send_welcome_emails(participants: list, event_name: str, db: Session) -> dict:
    """Draft + send a welcome email to every participant in the uploaded list."""
    sent_count = 0

    for p in participants:
        prompt = f"""You are an event coordinator. Write a warm, concise welcome email (3-4 sentences) for a participant joining an event.

Event: {event_name}
Participant Name: {p.name}
Participant Email: {p.email}
Skills: {p.skill}

The email should:
- Welcome them by name to the event
- Confirm their registration has been received
- Tell them to watch their inbox for team assignment details
- Wish them good luck

Do not include a subject line. Just the email body."""

        body = call_gemini(prompt)
        subject = f"Welcome to {event_name} — You're registered!"

        _save_and_send(db, p.email, subject, body, comm_type="WELCOME")
        sent_count += 1

    return {"welcome_emails_sent": sent_count}


# ---------------------------------------------------------------------------
# 2. Team assignment email — fired when a team is APPROVED
# ---------------------------------------------------------------------------

def send_team_assignment_emails(team: Team, members: list, event_name: str, db: Session) -> dict:
    """Draft + send a team assignment email to each member of an approved team."""
    member_names = [m.name for m in members]
    member_skills = [m.skill for m in members]
    sent_count = 0

    for member in members:
        prompt = f"""You are an event coordinator. Write a warm team assignment email for a hackathon participant.

Event: {event_name}
Team Name: {team.name}
Recipient Name: {member.name}
Team Members: {', '.join(member_names)}
Team Skills: {', '.join(member_skills)}

The email should (3-4 sentences):
- Address them by name and announce their team assignment
- List all team members and their skills
- Encourage them to connect with teammates soon
- Mention the event is starting and wish them success

Do not include a subject line. Just the email body."""

        body = call_gemini(prompt)
        subject = f"Your Team Assignment — {team.name} | {event_name}"

        _save_and_send(db, member.email, subject, body, comm_type="TEAM_ASSIGNMENT")
        sent_count += 1

    return {"team_assignment_emails_sent": sent_count}


# ---------------------------------------------------------------------------
# 3. Evaluation reminder — fired when evaluation stage activates
# ---------------------------------------------------------------------------

def send_evaluation_reminder_emails(db: Session) -> dict:
    """Send evaluation reminder to members of approved teams only."""
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    # Only participants who are in an APPROVED team
    approved_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_member_ids = set()
    for team in approved_teams:
        approved_member_ids.update(json.loads(team.member_ids))

    participants = db.query(Participant).filter(Participant.id.in_(approved_member_ids)).all()
    sent_count = 0

    for p in participants:
        prompt = f"""You are an event coordinator. Write a concise evaluation reminder email (3-4 sentences).

Event: {event_name}
Participant Name: {p.name}

The email should:
- Address them by name
- Announce that the evaluation round is starting
- Remind them to prepare their presentation / deliverable
- Tell them judges will evaluate on innovation, execution, and impact

Do not include a subject line. Just the email body."""

        body = call_gemini(prompt)
        subject = f"Evaluation Round Starting — {event_name}"

        _save_and_send(db, p.email, subject, body, comm_type="EVALUATION_REMINDER")
        sent_count += 1

    return {"evaluation_reminder_emails_sent": sent_count}


# ---------------------------------------------------------------------------
# 4. Results email — fired when results stage activates
# ---------------------------------------------------------------------------

def send_results_emails(db: Session) -> dict:
    """
    Send results emails to all participants.
    Teams with scores above the advancement threshold get a 'qualified' email;
    others get a 'thank you for participating' email.
    """
    from models import Score, Team
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    scoring_config = json.loads(config.scoring) if config else {}
    max_score = scoring_config.get("max_score", 10)
    advancement_rule = scoring_config.get("advancement_rule", "top teams advance")

    # Build team scores
    teams = db.query(Team).filter(Team.status == "APPROVED").all()
    team_scores = {}
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id).all()
        if scores:
            avg = sum(s.score for s in scores) / len(scores)
        else:
            avg = 0.0
        team_scores[team.id] = {"team": team, "avg": avg}

    # Determine advancement cutoff: top 50% qualify
    if team_scores:
        sorted_teams = sorted(team_scores.values(), key=lambda x: x["avg"], reverse=True)
        cutoff_index = max(1, len(sorted_teams) // 2)
        qualified_team_ids = {item["team"].id for item in sorted_teams[:cutoff_index]}
    else:
        qualified_team_ids = set()

    # Build participant → team map
    participant_team_map = {}
    for team in teams:
        member_ids = json.loads(team.member_ids)
        for pid in member_ids:
            participant_team_map[pid] = team

    participants = db.query(Participant).all()
    sent_count = 0

    for p in participants:
        team = participant_team_map.get(p.id)
        if team and team.id in qualified_team_ids:
            avg_score = round(team_scores[team.id]["avg"], 2)
            prompt = f"""You are an event coordinator. Write a congratulatory results email.

Event: {event_name}
Participant Name: {p.name}
Team: {team.name}
Score: {avg_score} / {max_score}
Advancement Rule: {advancement_rule}

The email should (3-4 sentences):
- Address them by name and congratulate them warmly
- Share their team's score and confirm they have qualified/advanced
- Tell them to watch for next steps
- Wish them continued success

Do not include a subject line. Just the email body."""
            subject = f"🎉 Congratulations — You Qualified! | {event_name}"
            comm_type = "RESULTS_QUALIFIED"
        else:
            prompt = f"""You are an event coordinator. Write a warm, encouraging results email for a participant who did not advance.

Event: {event_name}
Participant Name: {p.name}

The email should (3-4 sentences):
- Address them by name and thank them for participating
- Acknowledge their hard work and effort
- Encourage them to keep building and to join future events
- End on a positive, motivating note

Do not include a subject line. Just the email body."""
            subject = f"Thank You for Participating | {event_name}"
            comm_type = "RESULTS_NOT_QUALIFIED"

        body = call_gemini(prompt)
        _save_and_send(db, p.email, subject, body, comm_type=comm_type)
        sent_count += 1

    return {"results_emails_sent": sent_count}


# ---------------------------------------------------------------------------
# 5. Dynamic stage-triggered emails — reads event config touchpoints
# ---------------------------------------------------------------------------

def trigger_stage_emails(stage_name: str, db: Session) -> dict:
    """
    Called whenever a pipeline stage activates.
    Directly dispatches to the right email function based on stage name keywords.
    No longer relies on fragile touchpoint string matching.
    """
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config:
        return {"triggered": False, "reason": "No active event config"}

    stage_upper = stage_name.upper().replace(" ", "_")

    # Direct dispatch by stage keyword — no string matching needed
    if any(k in stage_upper for k in ["EVALUATION", "JUDGING", "ASSESS"]):
        results = send_evaluation_reminder_emails(db)
        return {"triggered": True, "stage": stage_name, **results}

    if any(k in stage_upper for k in ["RESULT", "FINAL", "WINNER"]):
        results = send_results_emails(db)
        return {"triggered": True, "stage": stage_name, **results}

    # Generic stage notification to approved team members only
    approved_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_member_ids = set()
    for team in approved_teams:
        approved_member_ids.update(json.loads(team.member_ids))

    participants = db.query(Participant).filter(Participant.id.in_(approved_member_ids)).all()
    if not participants:
        return {"triggered": False, "reason": "No approved team members to notify"}

    event_name = config.event_name
    sent_count = 0
    for p in participants:
        prompt = f"""You are an event coordinator. Write a brief stage update email (2-3 sentences).

Event: {event_name}
Participant Name: {p.name}
Stage Starting: {stage_name.replace('_', ' ').title()}

Notify them that this stage is now active and what they should do next.
Do not include a subject line. Just the email body."""
        body = call_gemini(prompt)
        subject = f"{stage_name.replace('_', ' ').title()} Stage Started — {event_name}"
        _save_and_send(db, p.email, subject, body, comm_type=f"STAGE_{stage_upper}")
        sent_count += 1

    return {"triggered": True, "stage": stage_name, "stage_emails_sent": sent_count}