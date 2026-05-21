from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Score
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

ANOMALY_THRESHOLD = 2.0

class ScoreRequest(BaseModel):
    team_id: int
    judge_name: str
    score: float
    notes: str = None

def check_anomaly(scores: list, new_score: float) -> bool:
    if len(scores) == 0:
        return False
    average = sum(scores) / len(scores)
    return abs(new_score - average) > ANOMALY_THRESHOLD

@router.post("/scores/submit")
def submit_score(request: ScoreRequest, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == request.team_id).first()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if request.score < 0 or request.score > 10:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 10")

    existing_scores = db.query(Score).filter(Score.team_id == request.team_id).all()
    existing_score_values = [s.score for s in existing_scores]

    is_anomaly = check_anomaly(existing_score_values, request.score)

    score = Score(
        team_id=request.team_id,
        judge_name=request.judge_name,
        score=request.score,
        notes=request.notes,
        anomaly_flagged=is_anomaly
    )
    db.add(score)
    db.commit()
    db.refresh(score)

    response = {
        "message": "Score submitted successfully",
        "score": {
            "id": score.id,
            "team_id": score.team_id,
            "judge_name": score.judge_name,
            "score": score.score,
            "notes": score.notes,
            "anomaly_flagged": score.anomaly_flagged,
            "created_at": score.created_at
        }
    }

    if is_anomaly:
        response["warning"] = f"Anomaly detected — this score deviates more than {ANOMALY_THRESHOLD} points from the panel average. Results are on hold."

    return response


@router.get("/scores/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    teams = db.query(Team).all()

    leaderboard = []
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id).all()

        if not scores:
            average = 0.0
            has_anomaly = False
            results_on_hold = False
        else:
            all_scores = [s.score for s in scores]
            average = round(sum(all_scores) / len(all_scores), 2)
            has_anomaly = any(s.anomaly_flagged for s in scores)
            results_on_hold = has_anomaly

        leaderboard.append({
            "team_id": team.id,
            "team_name": team.name,
            "average_score": average,
            "has_anomaly": has_anomaly,
            "results_on_hold": results_on_hold,
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


@router.post("/scores/resolve/{score_id}")
def resolve_anomaly(score_id: int, db: Session = Depends(get_db)):
    score = db.query(Score).filter(Score.id == score_id).first()

    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    if not score.anomaly_flagged:
        raise HTTPException(status_code=400, detail="This score has no anomaly to resolve")

    score.anomaly_flagged = False
    db.commit()

    return {
        "message": f"Anomaly resolved for score id {score_id}",
        "score_id": score_id,
        "anomaly_flagged": score.anomaly_flagged
    }