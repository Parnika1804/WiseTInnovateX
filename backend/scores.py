from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Score, Participant, EventConfig, User
from pydantic import BaseModel
from datetime import datetime
from email_service import send_email
from activity import log_action
from gemini import call_gemini  # <-- ADDED THIS: Importing the AI function
import json

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

    # Extract the specific skills of the members on this team
    member_ids = []
    if team.member_ids:
        try:
            member_ids = json.loads(team.member_ids)
        except:
            pass
            
    members = db.query(Participant).filter(Participant.id.in_(member_ids)).all()
    skills = [m.skill for m in members if m.skill]
    skills_str = ", ".join(skills) if skills else "General"

    # THE FIX: Dynamically generate the rubric using Gemini
    prompt = f"""You are an expert hackathon judge. 
    Create a concise, structured assessment guide (rubric) for evaluating a team that has the following combined skills: {skills_str}.
    The maximum score they can receive is {max_score}.
    Keep it to 3-4 bullet points focusing on what to look for based on their specific technical stack and skills. 
    Do not include introductory text, just the bullet points."""
    
    try:
        guide = call_gemini(prompt)
    except Exception as e:
        print(f"AI Generation Failed: {e}")
        # Fallback just in case API limits are hit
        guide = f"Evaluate this team based on the configured criteria. Maximum score allowed is {max_score}. Focus on their specific skill integration: {skills_str}."
    
    return {"max_score": max_score, "assessment_guide": guide.strip()}

# ---------------------------------------------------------
# Submit Score
# ---------------------------------------------------------
@router.post("/scores/submit")
def submit_score(request: ScoreRequest, db: Session = Depends(get_db)):
    # 1. ENFORCE SINGLE SUBMISSION: Check if judge already scored this team
    existing = db.query(Score).filter(
        Score.team_id == request.team_id, 
        Score.judge_name == request.judge_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a score for this team.")

    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    config = get_dynamic_scoring_config(db)
    max_score = config.get("max_score", 10.0) if config else 10.0

    if request.score < 0 or request.score > max_score:
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {max_score}")

    existing_scores = [s.score for s in db.query(Score).filter(Score.team_id == request.team_id).all()]
    is_anomaly = check_anomaly(existing_scores, request.score, max_score)

    new_score = Score(
        team_id=request.team_id,
        judge_name=request.judge_name,
        score=request.score,
        notes=request.notes,
        anomaly_flagged=is_anomaly
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
    """Returns a list of teams this judge has successfully evaluated."""
    scores = db.query(Score).filter(Score.judge_name == judge_name).all()
    return [{"team_id": s.team_id, "score": s.score} for s in scores]

# ---------------------------------------------------------
# Leaderboard & Anomalies
# ---------------------------------------------------------
@router.get("/scores/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    leaderboard = []

    config = get_dynamic_scoring_config(db)
    max_score = config.get("max_score", 10.0) if config else 10.0

    for t in teams:
        scores = db.query(Score).filter(Score.team_id == t.id).all()
        if not scores:
            continue

        has_anomaly = any(s.anomaly_flagged for s in scores)
        avg = sum(s.score for s in scores) / len(scores)

        leaderboard.append({
            "team_id": t.id,
            "team_name": t.name,
            "average_score": avg,
            "max_score": max_score,
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
    """Approves the score and clears the hold on the team."""
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    score.anomaly_flagged = False
    db.commit()

    log_action(db, "ANOMALY_RESOLVED", f"Anomaly resolved for score {score_id} (Team {score.team_id})", "committee")
    return {"message": "Anomaly resolved successfully"}

@router.post("/scores/reject/{score_id}")
def reject_anomaly(score_id: int, db: Session = Depends(get_db)):
    """Deletes an anomalous score and emails the judge to re-evaluate."""
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
# Finalize Evaluation & Trigger Results
# ---------------------------------------------------------
@router.post("/scores/finalize")
def finalize_evaluation(db: Session = Depends(get_db)):
    """Ends the evaluation phase, runs the AI advancement logic, and drafts emails."""
    from email_triggers import send_results_emails
    
    try:
        result = send_results_emails(db)
        log_action(
            db=db, 
            action="EVALUATION_ENDED", 
            description="Committee finalized the evaluation round and triggered AI progression logic.", 
            performed_by="committee"
        )
        return {"message": "Evaluation finalized and emails drafted successfully.", "result": result}
    except Exception as e:
        print(f"Error finalizing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to finalize evaluation: {str(e)}")