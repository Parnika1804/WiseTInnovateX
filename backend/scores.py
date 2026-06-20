from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from models import Team, Score, Participant, EventConfig, User, CommunicationLog, ActivityLog, SpecialMention
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
from datetime import datetime, timedelta
from email_service import send_email
from activity import log_action
from websocket_manager import manager
from gemini import call_gemini
import json
import uuid
import re

router = APIRouter()

ANOMALY_THRESHOLD = 2.0

class ScoreRequest(BaseModel):
    team_id: int
    judge_name: str
    score: float
    notes: str = None

def get_dynamic_scoring_config(db: Session):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if config:
        scoring = json.loads(config.scoring)
        return scoring
    return None

def check_anomaly(scores: list, new_score: float, max_score: float = 10.0) -> bool:
    if len(scores) == 0:
        return False
    average = sum(scores) / len(scores)
    threshold = max_score * 0.2
    return abs(new_score - average) > threshold

# ---------------------------------------------------------
# Assessment Guide
# ---------------------------------------------------------
@router.get("/scores/assessment-guide/{team_id}")
def get_assessment_guide(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    config = get_dynamic_scoring_config(db)
    max_score = config.get("max_score", 10.0) if config else 10.0

    member_ids = []
    if team.member_ids:
        try:
            member_ids = json.loads(team.member_ids)
        except:
            pass

    members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
    skills = [m.skill for m in members if m.skill]
    skills_str = ", ".join(skills) if skills else "General"

    prompt = f"""You are an expert hackathon judge. 
    Create a concise, structured assessment guide (rubric) for evaluating a team that has the following combined skills: {skills_str}.
    The maximum score they can receive is {max_score}.
    Keep it to 3-4 bullet points focusing on what to look for based on their specific technical stack and skills. 
    Do not include introductory text, just the bullet points."""

    try:
        guide = call_gemini(prompt)
    except Exception as e:
        print(f"AI Generation Failed: {e}")
        guide = f"Evaluate this team based on the configured criteria. Maximum score allowed is {max_score}. Focus on their specific skill integration: {skills_str}."

    return {"max_score": max_score, "assessment_guide": guide.strip()}

# ---------------------------------------------------------
# Submit Score
# ---------------------------------------------------------
@router.post("/scores/submit")
def submit_score(request: ScoreRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    scoring_data = json.loads(config.scoring) if config else {}
    max_score = scoring_data.get("max_score", 10.0)
    current_round = scoring_data.get("current_round", 1)

    existing = db.query(Score).filter(
        Score.team_id == request.team_id,
        Score.judge_name == request.judge_name,
        Score.round_number == current_round
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a score for this team in this round.")

    # Allow scoring for both qualified teams AND special mention teams
    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if not team.is_qualified and not team.is_special_mention:
        raise HTTPException(status_code=400, detail="This team is not eligible for scoring in this round.")

    if request.score < 0 or request.score > max_score:
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {max_score}")

    existing_scores = [s.score for s in db.query(Score).filter(
        Score.team_id == request.team_id,
        Score.round_number == current_round
    ).all()]
    is_anomaly = check_anomaly(existing_scores, request.score, max_score)

    new_score = Score(
        team_id=request.team_id,
        judge_name=request.judge_name,
        score=request.score,
        notes=request.notes,
        anomaly_flagged=is_anomaly,
        round_number=current_round
    )

    db.add(new_score)
    db.commit()

    log_action(db, "SCORE_SUBMITTED", f"Score of {request.score} submitted for team {request.team_id}", "judge", "Score", new_score.id)
    background_tasks.add_task(manager.broadcast_to_channel, "leaderboard", {"event": "leaderboard_updated"})

    if is_anomaly:
        return {"message": "Score submitted.", "warning": "Your score deviates significantly from the panel average and has been flagged for committee review."}

    return {"message": "Score submitted successfully"}

# ---------------------------------------------------------
# Fetch Judge's Completed Scores
# ---------------------------------------------------------
@router.get("/scores/judge/{judge_name}")
def get_judge_scores(judge_name: str, db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    scoring_data = json.loads(config.scoring) if config else {}
    current_round = scoring_data.get("current_round", 1)
    
    scores = db.query(Score).filter(
        Score.judge_name == judge_name,
        Score.round_number == current_round
    ).all()
    return [{"team_id": s.team_id, "score": s.score} for s in scores]

# ---------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------
@router.get("/scores/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    max_score = 10.0
    current_round = 1

    if config:
        scoring = json.loads(config.scoring)
        max_score = scoring.get("max_score", 10.0)
        current_round = scoring.get("current_round", 1)

    # Only show regular qualified teams in live leaderboard — not SM teams
    teams = db.query(Team).filter(
        Team.status == "APPROVED",
        Team.is_qualified == True,
        Team.is_special_mention == False
    ).all()

    leaderboard = []
    for t in teams:
        scores = db.query(Score).filter(
            Score.team_id == t.id,
            Score.round_number == current_round
        ).all()

        if not scores:
            continue

        has_anomaly = any(s.anomaly_flagged for s in scores)
        avg = sum(s.score for s in scores) / len(scores)

        leaderboard.append({
            "team_id": t.id,
            "team_name": t.name,
            "average_score": round(avg, 2),
            "max_score": max_score,
            "current_round": current_round,
            "is_qualified": t.is_qualified,
            "results_on_hold": has_anomaly,
            "has_anomaly": has_anomaly,
            "scores": [
                {
                    "judge_name": s.judge_name,
                    "score": s.score,
                    "notes": s.notes,
                    "anomaly_flagged": s.anomaly_flagged
                }
                for s in scores
            ]
        })

    leaderboard.sort(key=lambda x: x["average_score"], reverse=True)
    return leaderboard

# ---------------------------------------------------------
# Finalized Podium
# ---------------------------------------------------------
@router.get("/scores/finalized")
def get_finalized_podium(db: Session = Depends(get_db)):
    log = db.query(ActivityLog).filter(ActivityLog.action == "EVALUATION_FINALIZED").first()
    if not log:
        return {"finalized": False, "podium": None}

    # FIX: Get the final round number from non-SM qualified teams only.
    # Using a global max could be skewed if SM teams were scored in a different round.
    from sqlalchemy import func
    non_sm_team_ids = [
        t.id for t in db.query(Team).filter(
            Team.status == "APPROVED",
            Team.is_special_mention == False
        ).all()
    ]
    max_round_result = (
        db.query(func.max(Score.round_number))
        .filter(Score.team_id.in_(non_sm_team_ids))
        .scalar()
    ) if non_sm_team_ids else None
    final_round = max_round_result or 1

    # Exclude special mention teams from regular podium
    teams = db.query(Team).filter(
        Team.status == "APPROVED",
        Team.is_special_mention == False
    ).all()

    team_scores = []
    for team in teams:
        # Only use final round scores for podium
        scores = db.query(Score).filter(
            Score.team_id == team.id,
            Score.round_number == final_round
        ).all()
        if not scores:
            continue
        avg = sum(s.score for s in scores) / len(scores)
        team_scores.append({"team": team, "avg": round(avg, 2)})

    team_scores.sort(key=lambda x: x["avg"], reverse=True)
    medals = {0: "🥇 1st Place", 1: "🥈 2nd Place", 2: "🥉 3rd Place"}

    podium = [
        {"rank": idx + 1, "medal": medals.get(idx), "team_name": e["team"].name, "team_id": e["team"].id, "final_score": e["avg"]}
        for idx, e in enumerate(team_scores[:3])
    ]

    # Special mention winner — final round scores only
    special_mention_winner = None
    approved_sm = db.query(SpecialMention).filter(SpecialMention.status == "APPROVED").all()
    sm_scores = []
    for sm in approved_sm:
        member_ids = json.loads(sm.nominated_member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
        team = db.query(Team).filter(Team.id == sm.team_id).first()
        # Final round scores only
        scores = db.query(Score).filter(
            Score.team_id == sm.team_id,
            Score.round_number == final_round
        ).all()
        if not scores:
            continue
        avg = sum(s.score for s in scores) / len(scores)
        sm_scores.append({
            "nomination_id": sm.id,
            "members": [{"id": m.id, "name": m.name, "skill": m.skill} for m in members],
            "team_name": team.name if team else None,
            "reason": sm.reason,
            "final_score": round(avg, 2)
        })

    if sm_scores:
        sm_scores.sort(key=lambda x: x["final_score"], reverse=True)
        special_mention_winner = sm_scores[0]

    return {"finalized": True, "podium": podium, "special_mention_winner": special_mention_winner}

# ---------------------------------------------------------
# Anomalies
# ---------------------------------------------------------
@router.get("/scores/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    anomalies = db.query(Score).filter(Score.anomaly_flagged == True).all()
    if not anomalies:
        return {"message": "No anomalies detected", "anomalies": []}

    return {
        "message": f"{len(anomalies)} anomaly(s) detected",
        "anomalies": [
            {
                "id": a.id,
                "team_id": a.team_id,
                "judge_name": a.judge_name,
                "score": a.score,
                "notes": a.notes,
                "created_at": a.created_at
            }
            for a in anomalies
        ]
    }

# ---------------------------------------------------------
# Anomaly Resolutions
# ---------------------------------------------------------
@router.post("/scores/resolve/{score_id}")
def resolve_anomaly(score_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    score.anomaly_flagged = False
    db.commit()

    log_action(db, "ANOMALY_RESOLVED", f"Anomaly resolved for score {score_id} (Team {score.team_id})", "committee")
    background_tasks.add_task(manager.broadcast_to_channel, "dashboard", {"event": "dashboard_updated"})
    background_tasks.add_task(manager.broadcast_to_channel, "leaderboard", {"event": "leaderboard_updated"})

    return {"message": "Anomaly resolved successfully"}

@router.post("/scores/reject/{score_id}")
def reject_anomaly(score_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    judge_name = score.judge_name
    team_id = score.team_id

    team = db.query(Team).filter(Team.id == team_id).first()
    team_name = team.name if team else f"Team #{team_id}"

    db.delete(score)
    db.commit()

    judge = db.query(User).filter(User.name == judge_name, User.role == "Judge").first()
    if judge and judge.email:
        subject = f"Action Required: Re-evaluation for {team_name}"
        body = f"Hello {judge_name},\n\nYour recent score for {team_name} was flagged for a discrepancy during committee review and has been rejected.\n\nPlease log back into your Judge Portal using your secure magic link and submit a new, re-evaluated score for this team.\n\nThank you,\nEvent Committee"
        send_email(judge.email, subject, body)

    log_action(
        db=db,
        action="ANOMALY_REJECTED",
        description=f"Rejected anomalous score from {judge_name} for {team_name}. Score deleted and re-evaluation email dispatched.",
        performed_by="committee"
    )

    background_tasks.add_task(manager.broadcast_to_channel, "dashboard", {"event": "dashboard_updated"})
    background_tasks.add_task(manager.broadcast_to_channel, "leaderboard", {"event": "leaderboard_updated"})

    return {"message": "Anomaly rejected. Score deleted and judge notified for re-scoring."}

# ---------------------------------------------------------
# Finalize Evaluation (Chronological Round Advancement)
# ---------------------------------------------------------
@router.post("/scores/finalize")
def finalize_evaluation(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    if not config:
        raise HTTPException(status_code=400, detail="No active event configuration found.")

    event_name = config.event_name
    scoring_data = json.loads(config.scoring)
    max_score = scoring_data.get("max_score", 10.0)
    advancement_rules = scoring_data.get("advancement_rules", [])

    current_round = scoring_data.get("current_round", 1)
    
    is_final_round = False
    current_rule_str = "final round"
    
    if advancement_rules and len(advancement_rules) >= current_round:
        current_rule_str = advancement_rules[current_round - 1].get("rule", "final round").lower()
        
    if "final" in current_rule_str or current_round > len(advancement_rules):
        is_final_round = True

    # Regular qualified teams only (exclude SM teams from main finalization)
    teams = db.query(Team).filter(
        Team.status == "APPROVED",
        Team.is_qualified == True,
        Team.is_special_mention == False
    ).all()

    if not teams:
        raise HTTPException(status_code=400, detail="No qualified teams found to finalize.")

    team_scores = []
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id, Score.round_number == current_round).all()
        avg = sum(s.score for s in scores) / len(scores) if scores else 0.0
        team_scores.append({"team": team, "avg": round(avg, 2)})

    team_scores.sort(key=lambda x: x["avg"], reverse=True)
    batch_id = str(uuid.uuid4())
    drafted_count = 0

    if is_final_round:
        medals = {0: "🥇 1st Place", 1: "🥈 2nd Place", 2: "🥉 3rd Place"}
        
        for idx, entry in enumerate(team_scores):
            team = entry["team"]
            avg = entry["avg"]
            member_ids = json.loads(team.member_ids)
            members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()

            is_winner = idx < 3
            rank_label = medals.get(idx, f"#{idx + 1}")

            for member in members:
                if is_winner:
                    subject = f"{rank_label} — {team.name} | {event_name} Final Results"
                    body = f"Dear {member.name},\n\nCongratulations! Your team '{team.name}' has achieved {rank_label} at {event_name} with a final score of {avg}/{max_score}. Amazing work, and we are incredibly proud of your innovation!"
                else:
                    subject = f"Final Results — {event_name} | Thank You for Participating"
                    body = f"Dear {member.name},\n\nThank you for participating in {event_name}. Your team '{team.name}' finished #{idx + 1} with a final score of {avg}/{max_score}. We loved your project and encourage you to keep building!"

                log = CommunicationLog(
                    recipient_email=member.email, subject=subject, message=body,
                    comm_type="FINAL_RESULTS", status="PENDING_APPROVAL", batch_id=batch_id
                )
                db.add(log)
                drafted_count += 1

        # --- Special Mention Winner ---
        approved_sm = db.query(SpecialMention).filter(SpecialMention.status == "APPROVED").all()
        special_mention_winner = None
        sm_scores = []

        for sm in approved_sm:
            sm_team_scores = db.query(Score).filter(
                Score.team_id == sm.team_id,
                Score.round_number == current_round
            ).all()
            if not sm_team_scores:
                # No scores submitted for this SM team — skip, don't award 0
                print(f"[SPECIAL MENTION] No scores found for team_id={sm.team_id} in round {current_round}. Skipping.")
                continue
            avg = sum(s.score for s in sm_team_scores) / len(sm_team_scores)
            sm_scores.append({"sm": sm, "avg": round(avg, 2)})

        if sm_scores:
            sm_scores.sort(key=lambda x: x["avg"], reverse=True)
            winner_sm = sm_scores[0]["sm"]
            winner_avg = sm_scores[0]["avg"]
            special_mention_winner = winner_sm

            member_ids = json.loads(winner_sm.nominated_member_ids)
            sm_members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
            sm_team = db.query(Team).filter(Team.id == winner_sm.team_id).first()

            for member in sm_members:
                subject = f"⭐ Special Mention Award — {event_name}"
                body = (
                    f"Dear {member.name},\n\n"
                    f"Congratulations! You have been awarded the Special Mention Award at {event_name}.\n\n"
                    f"Your mentor recognized your outstanding contribution to team '{sm_team.name if sm_team else ''}' "
                    f"and nominated you as a wildcard finalist. You competed in the final round with a score of "
                    f"{winner_avg}/{max_score}.\n\n"
                    f"Reason for nomination: {winner_sm.reason}\n\n"
                    f"We are incredibly proud of your talent and dedication. Keep building!\n\nEvent Committee"
                )
                log = CommunicationLog(
                    recipient_email=member.email, subject=subject, message=body,
                    comm_type="SPECIAL_MENTION_WINNER", status="PENDING_APPROVAL", batch_id=batch_id
                )
                db.add(log)
                drafted_count += 1

        db.commit()

        podium = [
            {"rank": idx + 1, "medal": medals.get(idx), "team_name": e["team"].name, "team_id": e["team"].id, "final_score": e["avg"]}
            for idx, e in enumerate(team_scores[:3])
        ]

        sm_winner_data = None
        if special_mention_winner:
            member_ids = json.loads(special_mention_winner.nominated_member_ids)
            sm_members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
            sm_team = db.query(Team).filter(Team.id == special_mention_winner.team_id).first()
            sm_winner_data = {
                "members": [{"id": m.id, "name": m.name, "skill": m.skill} for m in sm_members],
                "team_name": sm_team.name if sm_team else None,
                "reason": special_mention_winner.reason,
                "final_score": sm_scores[0]["avg"] if sm_scores else 0.0
            }
        # --- Feedback Emails ---
        try:
            from jose import jwt as jose_jwt
            from email_triggers import _save_as_draft
            SECRET_KEY = "eventflow-secret-key-2026"
            all_participants = db.query(Participant).filter(Participant.registration_status == "approved").all()
            for participant in all_participants:
                token_data = {
                    "email": participant.email,
                    "role": "Participant",
                    "name": participant.name,
                    "exp": datetime.utcnow() + timedelta(days=7),
                }
                token = jose_jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
                feedback_link = f"http://localhost:5173/feedback?token={token}"
                fb_log = CommunicationLog(
                    recipient_email=participant.email,
                    subject=f"Share Your Feedback — {event_name}",
                    message=f"Dear {participant.name},\n\nThank you for being part of {event_name}!\n\nPlease share your feedback here:\n{feedback_link}\n\nWarm regards,\nEvent Committee",
                    comm_type="FEEDBACK_REQUEST",
                    status="PENDING_APPROVAL",
                    batch_id=batch_id
                )
                db.add(fb_log)
                drafted_count += 1
            db.commit()
        except Exception as e:
            print(f"Failed to draft feedback emails: {e}")
        log_action(db, "EVALUATION_FINALIZED", f"Final results declared. Winner: {team_scores[0]['team'].name}. {drafted_count} result emails drafted for approval.", "committee")
        
        background_tasks.add_task(manager.broadcast_to_channel, "dashboard", {"event": "dashboard_updated"})
        background_tasks.add_task(manager.broadcast_to_channel, "comms", {"event": "comms_updated"})
        background_tasks.add_task(manager.broadcast_to_channel, "leaderboard", {"event": "leaderboard_updated"})

        return {
            "message": "Final event results declared successfully.",
            "is_final": True,
            "podium": podium,
            "special_mention_winner": sm_winner_data,
            "total_teams": len(team_scores),
            "emails_drafted": drafted_count,
            "batch_id": batch_id,
        }

    else:
        match = re.search(r'(\d+)%', current_rule_str)
        cutoff_pct = int(match.group(1)) if match else 50
        
        cutoff_index = max(1, int(len(team_scores) * (cutoff_pct / 100.0)))
        advancing_teams = team_scores[:cutoff_index]
        eliminated_teams = team_scores[cutoff_index:]

        for e in eliminated_teams:
            e["team"].is_qualified = False
            e["team"].is_special_mention = False  # Clear stale SM approval if team is eliminated

        # Send nomination invite to mentors of eliminated teams — only in second last round
        total_rounds = len(advancement_rules) + 1  # +1 because final round has no advancement rule
        if current_round == total_rounds - 1:
            from models import Mentor
            from email_triggers import send_mentor_nomination_invite_email
            for e in eliminated_teams:
                mentor = db.query(Mentor).filter(Mentor.assigned_team_id == e["team"].id).first()
                if mentor:
                    try:
                        send_mentor_nomination_invite_email(db, mentor, e["team"])
                    except Exception as ex:
                        print(f"[MENTOR NOMINATION EMAIL ERROR] {ex}")

        for entry in team_scores:
            team = entry["team"]
            avg = entry["avg"]
            has_advanced = team.is_qualified
            member_ids = json.loads(team.member_ids)
            members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()

            for member in members:
                if has_advanced:
                    subject = f"Congratulations! You've advanced to Round {current_round + 1}"
                    body = f"Dear {member.name},\n\nGreat job! Your team '{team.name}' scored {avg}/{max_score} in Round {current_round} and has successfully advanced to the next phase of the hackathon. Check your portal to prepare for the next challenge!"
                    comm_type = "RESULTS_QUALIFIED"
                else:
                    subject = f"Event Results — Round {current_round}"
                    body = f"Dear {member.name},\n\nThank you for giving your all. Your team '{team.name}' scored {avg}/{max_score}. Unfortunately, you did not meet the {cutoff_pct}% cutoff for the next round. We appreciate your hard work and hope to see you at future events!"
                    comm_type = "RESULTS_NOT_QUALIFIED"

                log = CommunicationLog(
                    recipient_email=member.email, subject=subject, message=body,
                    comm_type=comm_type, status="PENDING_APPROVAL", batch_id=batch_id
                )
                db.add(log)
                drafted_count += 1
                
        judges = db.query(User).filter(User.role == "Judge").all()
        for judge in judges:
            subject = f"Action Required: Round {current_round + 1} Evaluation Ready"
            body = f"Hello {judge.name},\n\nRound {current_round} has concluded and the top {cutoff_pct}% of teams have advanced.\n\nRound {current_round + 1} is now active. Please log back into your Judge Portal using your secure magic link to evaluate the remaining qualified teams.\n\nThank you,\nEvent Committee"
            log = CommunicationLog(
                recipient_email=judge.email, subject=subject, message=body,
                comm_type="JUDGE_NOTIFICATION", status="PENDING_APPROVAL", batch_id=batch_id
            )
            db.add(log)
            drafted_count += 1

        scoring_data["current_round"] = current_round + 1
        config.scoring = json.dumps(scoring_data)
        
        db.commit()

        log_action(db, "ROUND_FINALIZED", f"Round {current_round} finalized. {len(advancing_teams)} teams advanced. Emails drafted to teams and judges.", "committee")

        background_tasks.add_task(manager.broadcast_to_channel, "dashboard", {"event": "dashboard_updated"})
        background_tasks.add_task(manager.broadcast_to_channel, "comms", {"event": "comms_updated"})
        background_tasks.add_task(manager.broadcast_to_channel, "leaderboard", {"event": "leaderboard_updated"})

        return {
            "message": f"Round {current_round} finalized. Top {cutoff_pct}% advanced.",
            "is_final": False,
            "teams_advanced": len(advancing_teams),
            "teams_eliminated": len(eliminated_teams),
            "emails_drafted": drafted_count,
            "batch_id": batch_id
        }
        
# ---------------------------------------------------------
# Team Feedback
# ---------------------------------------------------------
@router.get("/scores/team-feedback/{team_id}")
def get_team_feedback(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    scores = db.query(Score).filter(Score.team_id == team_id).order_by(Score.round_number).all()

    feedback = [
        {
            "round_number": s.round_number,
            "score": s.score,
            "notes": s.notes,
        }
        for s in scores
    ]

    return {"team_id": team_id, "feedback": feedback}
