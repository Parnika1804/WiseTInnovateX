from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Team
from pydantic import BaseModel
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from database import Base
from datetime import datetime

router = APIRouter()

class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    judge_name = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScoreRequest(BaseModel):
    team_id: int
    judge_name: str
    score: float
    notes: str = None

@router.post("/scores/submit")
def submit_score(request: ScoreRequest, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == request.team_id).first()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if request.score < 0 or request.score > 10:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 10")

    score = Score(
        team_id=request.team_id,
        judge_name=request.judge_name,
        score=request.score,
        notes=request.notes
    )
    db.add(score)
    db.commit()
    db.refresh(score)

    return {
        "message": "Score submitted successfully",
        "score": {
            "id": score.id,
            "team_id": score.team_id,
            "judge_name": score.judge_name,
            "score": score.score,
            "notes": score.notes,
            "created_at": score.created_at
        }
    }


@router.get("/scores/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    teams = db.query(Team).all()

    leaderboard = []
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id).all()

        if not scores:
            average = 0.0
            all_scores = []
        else:
            all_scores = [s.score for s in scores]
            average = round(sum(all_scores) / len(all_scores), 2)

        leaderboard.append({
            "team_id": team.id,
            "team_name": team.name,
            "average_score": average,
            "scores": [
                {
                    "judge_name": s.judge_name,
                    "score": s.score,
                    "notes": s.notes
                }
                for s in scores
            ]
        })

    leaderboard.sort(key=lambda x: x["average_score"], reverse=True)

    return leaderboard