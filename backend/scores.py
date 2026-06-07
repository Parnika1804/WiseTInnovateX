from fastapi import APIRouter, Depends, HTTPException
from models import Team, Score, Participant, EventConfig, User, CommunicationLog, ActivityLog
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Score, Participant, EventConfig, User, CommunicationLog
from pydantic import BaseModel
from datetime import datetime
from email_service import send_email
from activity import log_action
from gemini import call_gemini
import json
import uuid

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
def submit_score(request: ScoreRequest, db: Session = Depends(get_db)):
    existing = db.query(Score).filter(
        Score.team_id == request.team_id,
        Score.judge_name == request.judge_name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a score for this team.")

    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    max_score = json.loads(config.scoring).get("max_score", 10.0) if config else 10.0
    current_round = (config.current_stage_index or 0) + 1 if config else 1

    if request.score < 0 or request.score > max_score:
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {max_score}")

    existing_scores = [s.score for s in db.query(Score).filter(Score.team_id == request.team_id).all()]
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

    if is_anomaly:
        return {"message": "Score submitted.", "warning": "Your score deviates significantly from the panel average and has been flagged for committee review."}

    return {"message": "Score submitted successfully"}

# ---------------------------------------------------------
# Fetch Judge's Completed Scores
# ---------------------------------------------------------
@router.get("/scores/judge/{judge_name}")
def get_judge_scores(judge_name: str, db: Session = Depends(get_db)):
    scores = db.query(Score).filter(Score.judge_name == judge_name).all()
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
        current_round = (config.current_stage_index or 0) + 1

    teams = db.query(Team).filter(
        Team.status == "APPROVED",
        Team.is_qualified == True
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
@router.get("/scores/finalized")
def get_finalized_podium(db: Session = Depends(get_db)):
    log = db.query(ActivityLog).filter(ActivityLog.action == "EVALUATION_FINALIZED").first()
    if not log:
        return {"finalized": False, "podium": None}

    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    current_round = (config.current_stage_index or 0) + 1 if config else 1
    max_score = json.loads(config.scoring).get("max_score", 10.0) if config else 10.0

    teams = db.query(Team).filter(Team.status == "APPROVED").all()
    team_scores = []
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id, Score.round_number == current_round).all()
        avg = sum(s.score for s in scores) / len(scores) if scores else 0.0
        team_scores.append({"team": team, "avg": round(avg, 2)})

    team_scores.sort(key=lambda x: x["avg"], reverse=True)
    medals = {0: "🥇 1st Place", 1: "🥈 2nd Place", 2: "🥉 3rd Place"}

    podium = [
        {"rank": idx + 1, "medal": medals.get(idx), "team_name": e["team"].name, "team_id": e["team"].id, "final_score": e["avg"]}
        for idx, e in enumerate(team_scores[:3])
    ]

    return {"finalized": True, "podium": podium}
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
def resolve_anomaly(score_id: int, db: Session = Depends(get_db)):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    score.anomaly_flagged = False
    db.commit()

    log_action(db, "ANOMALY_RESOLVED", f"Anomaly resolved for score {score_id} (Team {score.team_id})", "committee")
    return {"message": "Anomaly resolved successfully"}

@router.post("/scores/reject/{score_id}")
def reject_anomaly(score_id: int, db: Session = Depends(get_db)):
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

    return {"message": "Anomaly rejected. Score deleted and judge notified for re-scoring."}

# ---------------------------------------------------------
# Finalize Evaluation
# ---------------------------------------------------------
# ---------------------------------------------------------
# Finalize Evaluation
@router.post("/scores/finalize")
def finalize_evaluation(db: Session = Depends(get_db)):
    config = db.query(EventConfig).filter(EventConfig.is_active == True).first()
    event_name = config.event_name if config else "the event"
    max_score = json.loads(config.scoring).get("max_score", 10.0) if config else 10.0
    current_round = (config.current_stage_index or 0) + 1 if config else 1
    if config:
        stages = json.loads(config.stages)
        if config.current_stage_index < len(stages) - 1:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot finalize yet. Currently on stage {config.current_stage_index + 1} of {len(stages)}. Advance to the final stage first."
            )

    # 1. Get all qualified approved teams
    teams = db.query(Team).filter(
        Team.status == "APPROVED",
        Team.is_qualified == True
    ).all()

    if not teams:
        raise HTTPException(status_code=400, detail="No qualified teams found to finalize.")

    # 2. Calculate final average scores
    team_scores = []
    for team in teams:
        scores = db.query(Score).filter(
            Score.team_id == team.id,
            Score.round_number == current_round
        ).all()
        avg = sum(s.score for s in scores) / len(scores) if scores else 0.0
        team_scores.append({
            "team": team,
            "avg": round(avg, 2)
        })

    # 3. Sort by score — top 3 are winners
    team_scores.sort(key=lambda x: x["avg"], reverse=True)

    medals = {0: "🥇 1st Place", 1: "🥈 2nd Place", 2: "🥉 3rd Place"}
    batch_id = str(uuid.uuid4())
    drafted_count = 0

    # 4. Draft emails for all teams
    for idx, entry in enumerate(team_scores):
        team = entry["team"]
        avg = entry["avg"]
        member_ids = json.loads(team.member_ids)
        members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()

        is_winner = idx < 3
        rank_label = medals.get(idx, f"#{idx + 1}")

        for member in members:
            if is_winner:
                prompt = f"""You are an event coordinator announcing final results for {event_name}.
Participant Name: {member.name}
Team: {team.name}
Final Rank: {rank_label}
Final Score: {avg} / {max_score}

Write a warm, celebratory email (4-5 sentences). Address them by name, announce their rank with excitement, congratulate their team, mention their score, end with encouragement for the future. No subject line."""
                subject = f"{rank_label} — {team.name} | {event_name} Final Results"
            else:
                prompt = f"""You are an event coordinator announcing final results for {event_name}.
Participant Name: {member.name}
Team: {team.name}
Final Rank: #{idx + 1}
Final Score: {avg} / {max_score}

Write a warm thank you email (3-4 sentences). Address them by name, thank them for participating, mention their final score, encourage them to keep building. No subject line."""
                subject = f"Final Results — {event_name} | Thank You for Participating"

            try:
                body = call_gemini(prompt)
            except:
                if is_winner:
                    body = f"Dear {member.name}, congratulations! Your team {team.name} has achieved {rank_label} at {event_name} with a score of {avg}/{max_score}. Amazing work!"
                else:
                    body = f"Dear {member.name}, thank you for participating in {event_name}. Your team {team.name} finished #{idx + 1} with a score of {avg}/{max_score}. Keep building!"

            log = CommunicationLog(
                recipient_email=member.email,
                subject=subject,
                message=body,
                comm_type="FINAL_RESULTS",
                status="PENDING_APPROVAL",
                batch_id=batch_id
            )
            db.add(log)
            drafted_count += 1

    db.commit()

    # 5. Build podium response
    podium = []
    for idx, entry in enumerate(team_scores[:3]):
        podium.append({
            "rank": idx + 1,
            "medal": medals.get(idx),
            "team_name": entry["team"].name,
            "team_id": entry["team"].id,
            "final_score": entry["avg"]
        })

    log_action(
        db=db,
        action="EVALUATION_FINALIZED",
        description=f"Final results declared. Winner: {team_scores[0]['team'].name}. {drafted_count} result emails drafted for approval.",
        performed_by="committee"
    )

    return {
        "message": "Final results declared successfully.",
        "podium": podium,
        "total_teams": len(team_scores),
        "emails_drafted": drafted_count,
        "batch_id": batch_id,
        "note": "Go to Pending Approvals to review and send result emails."
    }