"""
email_triggers.py
Auto-email helpers called by roster, teams, scores, and pipeline routers.
"""

from sqlalchemy.orm import Session
from models import CommunicationLog, Participant, Team, EventConfig
from email_service import send_email
from gemini import call_gemini
from datetime import datetime
from activity import log_action
import json
import uuid

def _save_and_send(db: Session, to_email: str, subject: str, body: str, comm_type: str = "AUTO", batch_id: str = None) -> CommunicationLog:
    log = CommunicationLog(
        recipient_email=to_email, subject=subject, message=body,
        comm_type=comm_type, status="SENT", sent_at=datetime.utcnow(), batch_id=batch_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    send_email(to_email, subject, body)
    log_action(db=db, action="EMAIL_SENT", description=f"Sent {comm_type} email to {to_email}: '{subject}'", performed_by="system", target_entity="CommunicationLog", target_id=log.id)
    return log

def _save_as_draft(db: Session, to_email: str, subject: str, body: str, comm_type: str = "AUTO", batch_id: str = None) -> CommunicationLog:
    log = CommunicationLog(
        recipient_email=to_email, subject=subject, message=body,
        comm_type=comm_type, status="PENDING_APPROVAL", sent_at=None, batch_id=batch_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    log_action(db=db, action=f"EMAIL_DRAFTED_{comm_type}", description=f"Drafted a {comm_type.lower().replace('_', ' ')} email for {to_email}. Awaiting committee approval.", performed_by="system", target_entity="CommunicationLog", target_id=log.id)
    return log

def send_welcome_emails(participants: list, event_name: str, db: Session) -> dict:
    batch_id = f"welcome-{uuid.uuid4().hex[:8]}"
    sent_count = 0
    for p in participants:
        prompt = f"You are an event coordinator. Write a warm, concise welcome email (3-4 sentences) for a participant joining an event.\nEvent: {event_name}\nParticipant Name: {p.name}\nParticipant Email: {p.email}\nSkills: {p.skill}\nThe email should: Welcome them by name to the event, Confirm their registration has been received, Tell them to watch their inbox for team assignment details, Wish them good luck. Do not include a subject line. Just the email body."
        body = call_gemini(prompt)
        subject = f"Welcome to {event_name} — You're registered!"
        _save_as_draft(db, p.email, subject, body, comm_type="WELCOME", batch_id=batch_id)
        sent_count += 1
    return {"welcome_emails_drafted": sent_count, "batch_id": batch_id, "status": "PENDING_APPROVAL"}

def send_team_assignment_emails(team: Team, members: list, event_name: str, db: Session) -> dict:
    member_names = [m.name for m in members]
    member_skills = [m.skill for m in members]
    sent_count = 0
    for member in members:
        prompt = f"You are an event coordinator. Write a warm team assignment email for a hackathon participant.\nEvent: {event_name}\nTeam Name: {team.name}\nRecipient Name: {member.name}\nTeam Members: {', '.join(member_names)}\nTeam Skills: {', '.join(member_skills)}\nThe email should (3-4 sentences): Address them by name and announce their team assignment, List all team members and their skills, Encourage them to connect with teammates soon, Mention the event is starting and wish them success. Do not include a subject line. Just the email body."
        body = call_gemini(prompt)
        subject = f"Your Team Assignment — {team.name} | {event_name}"
        _save_as_draft(db, member.email, subject, body, comm_type="TEAM_ASSIGNMENT")
        sent_count += 1
    return {"team_assignment_emails_drafted": sent_count}

def send_evaluation_reminder_emails(db: Session, batch_id: str = None) -> dict:
    if batch_id is None: batch_id = str(uuid.uuid4())
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"
    approved_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_member_ids = set()
    for team in approved_teams:
        approved_member_ids.update(json.loads(team.member_ids))
    participants = db.query(Participant).filter(Participant.id.in_(approved_member_ids)).all()
    drafted_count = 0
    for p in participants:
        prompt = f"You are an event coordinator. Write a concise evaluation reminder email (3-4 sentences).\nEvent: {event_name}\nParticipant Name: {p.name}\nThe email should: Address them by name, Announce that the evaluation round is starting, Remind them to prepare their presentation / deliverable, Tell them judges will evaluate on innovation, execution, and impact. Do not include a subject line. Just the email body."
        body = call_gemini(prompt)
        subject = f"Evaluation Round Starting — {event_name}"
        _save_as_draft(db, p.email, subject, body, comm_type="EVALUATION_REMINDER", batch_id=batch_id)
        drafted_count += 1
    return {"evaluation_reminder_emails_drafted": drafted_count, "status": "PENDING_APPROVAL", "batch_id": batch_id, "note": "Emails are queued for committee approval."}

def send_results_emails(db: Session, batch_id: str = None) -> dict:
    if batch_id is None: batch_id = str(uuid.uuid4())
    from models import Score, Team
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"
    scoring_config = json.loads(config.scoring) if config else {}
    max_score = scoring_config.get("max_score", 10)
    advancement_rule = scoring_config.get("advancement_rule", "Top 50% advance")

    teams = db.query(Team).filter(Team.status == "APPROVED").all()
    team_scores = {}
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id).all()
        avg = sum(s.score for s in scores) / len(scores) if scores else 0.0
        team_scores[team.id] = {"team": team, "avg": avg}

    qualified_team_ids = set()
    if team_scores:
        teams_data = [{"team_id": tid, "score": round(data["avg"], 2)} for tid, data in team_scores.items()]
        prompt = f"""You are an AI judging assistant.
The advancement rule for this event is: "{advancement_rule}"

Here are the participating teams and their final average scores:
{json.dumps(teams_data, indent=2)}

Based strictly on the advancement rule, which teams qualify?
Return ONLY a valid JSON array of team_ids (integers). No markdown, no text.
Example: [1, 3, 4]"""

        try:
            raw_response = call_gemini(prompt).strip()
            if "```" in raw_response:
                raw_response = raw_response.split("```")[1].replace("json", "").strip()
            start = raw_response.find("[")
            end = raw_response.rfind("]") + 1
            if start != -1 and end != 0:
                qualified_list = json.loads(raw_response[start:end])
                qualified_team_ids = set(int(x) for x in qualified_list)
            else:
                raise ValueError("No JSON array found")
        except Exception as e:
            print(f"AI Advancement Logic Failed: {e}. Falling back to default top 50%.")
            sorted_teams = sorted(team_scores.items(), key=lambda x: x[1]["avg"], reverse=True)
            cutoff_index = max(1, len(sorted_teams) // 2)
            qualified_team_ids = {item[0] for item in sorted_teams[:cutoff_index]}

    participant_team_map = {}
    approved_member_ids = set()
    for team in teams:
        for pid in json.loads(team.member_ids):
            participant_team_map[pid] = team
            approved_member_ids.add(pid)

    participants = db.query(Participant).all()
    drafted_count = 0

    for p in participants:
        team = participant_team_map.get(p.id)
        if team and team.id in qualified_team_ids:
            avg_score = round(team_scores[team.id]["avg"], 2)
            prompt = f"You are an event coordinator. Write a congratulatory results email.\nEvent: {event_name}\nParticipant Name: {p.name}\nTeam: {team.name}\nScore: {avg_score} / {max_score}\nAdvancement Rule: {advancement_rule}\nThe email should (3-4 sentences): Address them by name and congratulate them warmly, Share their team's score and confirm they have qualified/advanced, Tell them to watch for next steps, Wish them continued success. Do not include a subject line. Just the email body."
            subject = f"🎉 Congratulations — You Qualified! | {event_name}"
            comm_type = "RESULTS_QUALIFIED"
        else:
            prompt = f"You are an event coordinator. Write a warm, encouraging results email for a participant who did not advance.\nEvent: {event_name}\nParticipant Name: {p.name}\nThe email should (3-4 sentences): Address them by name and thank them for participating, Acknowledge their hard work and effort, Encourage them to keep building and to join future events, End on a positive, motivating note. Do not include a subject line. Just the email body."
            subject = f"Thank You for Participating | {event_name}"
            comm_type = "RESULTS_NOT_QUALIFIED"

        body = call_gemini(prompt)
        _save_as_draft(db, p.email, subject, body, comm_type=comm_type, batch_id=batch_id)
        drafted_count += 1

    return {
        "results_emails_drafted": drafted_count,
        "status": "PENDING_APPROVAL",
        "batch_id": batch_id,
        "note": "Emails are queued for committee approval.",
    }

def trigger_stage_emails(stage_name: str, db: Session) -> dict:
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config: return {"triggered": False, "reason": "No active event config"}

    batch_id = str(uuid.uuid4())
    stage_upper = stage_name.upper().replace(" ", "_")

    if any(k in stage_upper for k in ["EVALUATION", "JUDGING", "ASSESS"]):
        results = send_evaluation_reminder_emails(db, batch_id=batch_id)
        return {"triggered": True, "stage": stage_name, **results}

    if any(k in stage_upper for k in ["RESULT", "FINAL", "WINNER"]):
        results = send_results_emails(db, batch_id=batch_id)
        return {"triggered": True, "stage": stage_name, **results}

    approved_teams = db.query(Team).filter(Team.status == "APPROVED").all()
    approved_member_ids = set()
    for team in approved_teams:
        approved_member_ids.update(json.loads(team.member_ids))

    participants = db.query(Participant).filter(Participant.id.in_(approved_member_ids)).all()
    if not participants: return {"triggered": False, "reason": "No approved team members to notify"}

    event_name = config.event_name
    drafted_count = 0
    for p in participants:
        prompt = f"You are an event coordinator. Write a brief stage update email (2-3 sentences).\nEvent: {event_name}\nParticipant Name: {p.name}\nStage Starting: {stage_name.replace('_', ' ').title()}\nNotify them that this stage is now active and what they should do next. Do not include a subject line. Just the email body."
        body = call_gemini(prompt)
        subject = f"{stage_name.replace('_', ' ').title()} Stage Started — {event_name}"
        _save_as_draft(db, p.email, subject, body, comm_type=f"STAGE_{stage_upper}", batch_id=batch_id)
        drafted_count += 1

    return {"triggered": True, "stage": stage_name, "stage_emails_drafted": drafted_count, "status": "PENDING_APPROVAL", "batch_id": batch_id}


def send_mentor_emails(db: Session) -> dict:
    from models import Mentor
    batch_id = str(uuid.uuid4())
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    mentors = db.query(Mentor).filter(Mentor.assigned_team_id != None).all()
    drafted_count = 0

    for mentor in mentors:
        team = db.query(Team).filter(Team.id == mentor.assigned_team_id).first()
        if not team:
            continue

        member_ids = json.loads(team.member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        member_details = [{"name": m.name, "email": m.email, "skill": m.skill} for m in members]

        mentor_prompt = f"""You are an event coordinator. Write a professional email to a mentor informing them of their assigned team.
Event: {event_name}
Mentor Name: {mentor.name}
Assigned Team: {team.name}
Team Members: {', '.join([f"{m['name']} ({m['skill']})" for m in member_details])}
Team Member Emails: {', '.join([m['email'] for m in member_details])}

Write a warm 3-4 sentence email introducing them to their team, listing member names, skills, and contact emails, and encouraging them to reach out soon. Do not include a subject line."""

        mentor_body = call_gemini(mentor_prompt)
        mentor_subject = f"Your Mentorship Assignment — {team.name} | {event_name}"
        _save_as_draft(db, mentor.email, mentor_subject, mentor_body, comm_type="MENTOR_ASSIGNMENT", batch_id=batch_id)
        drafted_count += 1

        for member in members:
            teammates = [m for m in members if m.id != member.id]
            teammate_details = ', '.join([f"{t.name} ({t.skill}, {t.email})" for t in teammates])

            participant_prompt = f"""You are an event coordinator. Write a warm email to a participant introducing their mentor and teammates.
Event: {event_name}
Participant Name: {member.name}
Team Name: {team.name}
Mentor Name: {mentor.name}
Mentor Email: {mentor.email}
Mentor Expertise: {mentor.expertise or 'General'}
Mentor Phone: {mentor.phone or 'Not provided'}
Teammates: {teammate_details}

Write a 4-5 sentence email that introduces their mentor with contact details, lists their teammates with skills and emails, and encourages them to connect with both. Do not include a subject line."""

            participant_body = call_gemini(participant_prompt)
            participant_subject = f"Meet Your Mentor & Teammates — {team.name} | {event_name}"
            _save_as_draft(db, member.email, participant_subject, participant_body, comm_type="MENTOR_INTRO", batch_id=batch_id)
            drafted_count += 1

    return {
        "mentor_emails_drafted": drafted_count,
        "batch_id": batch_id,
        "status": "PENDING_APPROVAL",
        "note": "Mentor and participant intro emails queued for committee approval."
    }


def send_mentor_link_emails(db: Session) -> dict:
    """
    Generates a magic link JWT for each mentor and drafts a personalized
    portal access email to Comms — exactly like judge magic links.
    Called from mentors.py when committee clicks 'Send Mentor Links'.
    """
    from models import Mentor
    from auth import create_token
    batch_id = str(uuid.uuid4())
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    mentors = db.query(Mentor).all()
    drafted_count = 0

    for mentor in mentors:
        token_data = {
            "email": mentor.email,
            "role": "Mentor",
            "name": mentor.name,
        }
        token = create_token(token_data)
        magic_link = f"http://localhost:5173/mentor-portal?token={token}"

        team = db.query(Team).filter(Team.id == mentor.assigned_team_id).first() if mentor.assigned_team_id else None
        team_info = f"Your assigned team is: {team.name}" if team else "You have not been assigned a team yet — check back soon."

        prompt = f"""You are an event coordinator. Write a professional, warm email to a mentor giving them access to their mentor portal.
Event: {event_name}
Mentor Name: {mentor.name}
{team_info}

Write 3-4 sentences welcoming them as a mentor, telling them to use the magic link below to access their portal where they can see their assigned team and submit nominations, and that the link is personal and should not be shared. Do not include a subject line. End the email body just before the link — I will append it separately."""

        body = call_gemini(prompt)
        full_body = f"{body}\n\nAccess your Mentor Portal here:\n{magic_link}\n\nPlease do not share this link — it is uniquely tied to your mentor session."

        subject = f"Your Mentor Portal Access — {event_name}"
        _save_as_draft(db, mentor.email, subject, full_body, comm_type="MENTOR_MAGIC_LINK", batch_id=batch_id)
        drafted_count += 1

    return {
        "mentor_link_emails_drafted": drafted_count,
        "batch_id": batch_id,
        "status": "PENDING_APPROVAL",
        "note": "Mentor portal link emails queued for committee approval."
    }


# Special Mention email functions

def send_special_mention_nomination_email(db: Session, nomination) -> dict:
    from models import Mentor
    batch_id = str(uuid.uuid4())
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    mentor = db.query(Mentor).filter(Mentor.id == nomination.mentor_id).first()
    team = db.query(Team).filter(Team.id == nomination.team_id).first()
    nominated_ids = json.loads(nomination.nominated_member_ids) if nomination.nominated_member_ids else []
    nominated_members = db.query(Participant).filter(Participant.id.in_(nominated_ids)).all()
    nominated_names = ", ".join([m.name for m in nominated_members]) or "Full team"

    from models import User
    committee_members = db.query(User).filter(User.role == "committee").all()
    drafted_count = 0

    for cm in committee_members:
        prompt = f"""You are an event management system. Write a brief, professional notification email to a committee member.
Event: {event_name}
A mentor has submitted a Special Mention nomination for review.
Mentor: {mentor.name if mentor else 'Unknown'} ({mentor.email if mentor else ''})
Team: {team.name if team else 'Unknown'}
Nominated Members: {nominated_names}
Reason given: {nomination.reason or 'No reason provided'}

Write 2-3 sentences informing the committee member that a nomination is pending their review in the dashboard. Do not include a subject line."""

        body = call_gemini(prompt)
        subject = f"⭐ Special Mention Nomination Pending Review — {team.name if team else 'Unknown Team'} | {event_name}"
        _save_as_draft(db, cm.email, subject, body, comm_type="SPECIAL_MENTION_NOMINATION", batch_id=batch_id)
        drafted_count += 1

    return {
        "special_mention_nomination_emails_drafted": drafted_count,
        "batch_id": batch_id,
        "status": "PENDING_APPROVAL",
        "note": "Committee notification emails queued for approval."
    }


def send_special_mention_decision_emails(db: Session, nomination, approved: bool) -> dict:
    batch_id = str(uuid.uuid4())
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"

    team = db.query(Team).filter(Team.id == nomination.team_id).first()
    nominated_ids = json.loads(nomination.nominated_member_ids) if nomination.nominated_member_ids else []
    nominated_members = db.query(Participant).filter(Participant.id.in_(nominated_ids)).all()
    drafted_count = 0

    for member in nominated_members:
        if approved:
            prompt = f"""You are an event coordinator. Write a warm, exciting email to a participant whose Special Mention nomination has been approved.
Event: {event_name}
Participant Name: {member.name}
Team: {team.name if team else 'your team'}

Write 3-4 sentences informing them that their mentor nominated them for a Special Mention, the committee has approved it, and they will now compete in the final round as a Special Mention wildcard entry alongside the main finalists. Mention they will be judged separately for a Special Mention award. Do not include a subject line."""
            subject = f"⭐ You've Been Granted Special Mention — Finals Entry | {event_name}"
            comm_type = "SPECIAL_MENTION_APPROVED"
        else:
            prompt = f"""You are an event coordinator. Write a warm, empathetic email to a participant whose Special Mention nomination was not approved.
Event: {event_name}
Participant Name: {member.name}
Team: {team.name if team else 'your team'}

Write 3-4 sentences acknowledging that their mentor nominated them for a Special Mention, thanking them for their effort during the event, and encouraging them to keep building for future events. Keep the tone positive and respectful. Do not include a subject line."""
            subject = f"Regarding Your Special Mention Nomination | {event_name}"
            comm_type = "SPECIAL_MENTION_REJECTED"

        body = call_gemini(prompt)
        _save_as_draft(db, member.email, subject, body, comm_type=comm_type, batch_id=batch_id)
        drafted_count += 1

    return {
        "special_mention_decision_emails_drafted": drafted_count,
        "batch_id": batch_id,
        "status": "PENDING_APPROVAL",
        "note": "Special mention decision emails queued for committee approval."
    }