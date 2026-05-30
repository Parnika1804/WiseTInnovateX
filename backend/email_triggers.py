"""
email_triggers.py
Auto-email helpers called by roster, teams, scores, and pipeline routers.

SEND POLICY
-----------
Operational emails  (WELCOME, TEAM_ASSIGNMENT)
  → _save_and_send()  – fires immediately; no approval needed.

Results / progression emails (EVALUATION_REMINDER, RESULTS_*, stage triggers)
  → _save_as_draft()  – saved as PENDING_APPROVAL; committee must approve
    before SendGrid delivers them.  Use the /comms/pending,
    /comms/approve/{id}, and /comms/approve-batch endpoints.
"""

from sqlalchemy.orm import Session
from models import CommunicationLog, Participant, Team, EventConfig
from email_service import send_email
from gemini import call_gemini
from datetime import datetime
from activity import log_action
import json
import uuid


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _save_and_send(
    db: Session,
    to_email: str,
    subject: str,
    body: str,
    comm_type: str = "AUTO",
    batch_id: str = None,
) -> CommunicationLog:
    """Persist a CommunicationLog entry and fire the email immediately."""
    log = CommunicationLog(
        recipient_email=to_email,
        subject=subject,
        message=body,
        comm_type=comm_type,
        status="SENT",
        sent_at=datetime.utcnow(),
        batch_id=batch_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    send_email(to_email, subject, body)

    # Centralized Addition: Log every out-going operational email automatically
    log_action(
        db=db,
        action="EMAIL_SENT",
        description=f"Sent {comm_type} email to {to_email}: '{subject}'",
        performed_by="system",
        target_entity="CommunicationLog",
        target_id=log.id
    )
    return log


def _save_as_draft(
    db: Session,
    to_email: str,
    subject: str,
    body: str,
    comm_type: str = "AUTO",
    batch_id: str = None,
) -> CommunicationLog:
    """
    Persist a CommunicationLog entry as PENDING_APPROVAL.
    Does NOT fire any email – committee must approve via /comms/approve/{id}.
    """
    log = CommunicationLog(
        recipient_email=to_email,
        subject=subject,
        message=body,
        comm_type=comm_type,
        status="PENDING_APPROVAL",
        sent_at=None,
        batch_id=batch_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Centralized Addition: Log every progression/results draft generated
    log_action(
        db=db,
        action=f"EMAIL_DRAFTED_{comm_type}", # e.g., EMAIL_DRAFTED_RESULTS
        description=f"Drafted a {comm_type.lower().replace('_', ' ')} email for {to_email}. Awaiting committee approval.",
        performed_by="system",
        target_entity="CommunicationLog",
        target_id=log.id
    )

    return log


# ---------------------------------------------------------------------------
# 1. Welcome email — fired when committee uploads CSV  (IMMEDIATE)
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
# 2. Team assignment email — fired when a team is APPROVED  (IMMEDIATE)
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
# 3. Evaluation reminder — PENDING_APPROVAL (progression comm)
# ---------------------------------------------------------------------------

def send_evaluation_reminder_emails(db: Session, batch_id: str = None) -> dict:
    """
    Draft evaluation reminder emails for approved team members.
    Saved as PENDING_APPROVAL — committee must approve before delivery.
    """
    if batch_id is None:
        batch_id = str(uuid.uuid4())

    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    approved_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_member_ids = set()
    for team in approved_teams:
        approved_member_ids.update(json.loads(team.member_ids))

    participants = db.query(Participant).filter(Participant.id.in_(approved_member_ids)).all()
    drafted_count = 0

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

        _save_as_draft(db, p.email, subject, body,
                       comm_type="EVALUATION_REMINDER", batch_id=batch_id)
        drafted_count += 1

    return {
        "evaluation_reminder_emails_drafted": drafted_count,
        "status": "PENDING_APPROVAL",
        "batch_id": batch_id,
        "note": "Emails are queued for committee approval. Approve via /comms/approve-batch or /comms/approve/{id}.",
    }


# ---------------------------------------------------------------------------
# 4. Results email — PENDING_APPROVAL (results comm)
# ---------------------------------------------------------------------------

def send_results_emails(db: Session, batch_id: str = None) -> dict:
    """
    Draft results emails for all participants.
    Saved as PENDING_APPROVAL — committee must approve before delivery.
    """
    if batch_id is None:
        batch_id = str(uuid.uuid4())

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
        avg = sum(s.score for s in scores) / len(scores) if scores else 0.0
        team_scores[team.id] = {"team": team, "avg": avg}

    # Determine advancement cutoff: top 50% qualify
    if team_scores:
        sorted_teams = sorted(team_scores.values(), key=lambda x: x["avg"], reverse=True)
        cutoff_index = max(1, len(sorted_teams) // 2)
        qualified_team_ids = {item["team"].id for item in sorted_teams[:cutoff_index]}
    else:
        qualified_team_ids = set()

    # Participant → team map
    participant_team_map = {}
    for team in teams:
        for pid in json.loads(team.member_ids):
            participant_team_map[pid] = team

    participants = db.query(Participant).all()
    drafted_count = 0

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
        _save_as_draft(db, p.email, subject, body,
                       comm_type=comm_type, batch_id=batch_id)
        drafted_count += 1

    return {
        "results_emails_drafted": drafted_count,
        "status": "PENDING_APPROVAL",
        "batch_id": batch_id,
        "note": "Emails are queued for committee approval. Approve via /comms/approve-batch or /comms/approve/{id}.",
    }


# ---------------------------------------------------------------------------
# 5. Dynamic stage-triggered emails — PENDING_APPROVAL for results/progression
# ---------------------------------------------------------------------------

def trigger_stage_emails(stage_name: str, db: Session) -> dict:
    """
    Called whenever a pipeline stage activates.
    Evaluation and Results stages save as PENDING_APPROVAL.
    Generic stage notifications also save as PENDING_APPROVAL.
    """
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config:
        return {"triggered": False, "reason": "No active event config"}

    batch_id = str(uuid.uuid4())
    stage_upper = stage_name.upper().replace(" ", "_")

    if any(k in stage_upper for k in ["EVALUATION", "JUDGING", "ASSESS"]):
        results = send_evaluation_reminder_emails(db, batch_id=batch_id)
        return {"triggered": True, "stage": stage_name, **results}

    if any(k in stage_upper for k in ["RESULT", "FINAL", "WINNER"]):
        results = send_results_emails(db, batch_id=batch_id)
        return {"triggered": True, "stage": stage_name, **results}

    # Generic stage notification — draft, don't send
    approved_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_member_ids = set()
    for team in approved_teams:
        approved_member_ids.update(json.loads(team.member_ids))

    participants = db.query(Participant).filter(Participant.id.in_(approved_member_ids)).all()
    if not participants:
        return {"triggered": False, "reason": "No approved team members to notify"}

    event_name = config.event_name
    drafted_count = 0
    for p in participants:
        prompt = f"""You are an event coordinator. Write a brief stage update email (2-3 sentences).

Event: {event_name}
Participant Name: {p.name}
Stage Starting: {stage_name.replace('_', ' ').title()}

Notify them that this stage is now active and what they should do next.
Do not include a subject line. Just the email body."""
        body = call_gemini(prompt)
        subject = f"{stage_name.replace('_', ' ').title()} Stage Started — {event_name}"
        _save_as_draft(db, p.email, subject, body,
                       comm_type=f"STAGE_{stage_upper}", batch_id=batch_id)
        drafted_count += 1

    return {
        "triggered": True,
        "stage": stage_name,
        "stage_emails_drafted": drafted_count,
        "status": "PENDING_APPROVAL",
        "batch_id": batch_id,
        "note": "Emails are queued for committee approval.",
    }
