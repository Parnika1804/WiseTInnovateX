from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from database import get_db, Base
from models import Participant, Team, Mentor, ActivityLog
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

# ---------------------------------------------------------------------------
# Inline model — keeps changes isolated to this one new file
# ---------------------------------------------------------------------------
class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    event_rating = Column(Integer, nullable=False)          # 1-5
    mentor_rating = Column(Integer, nullable=True)          # 1-5, optional if no mentor
    judging_rating = Column(Integer, nullable=False)        # 1-5
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class FeedbackSubmit(BaseModel):
    participant_id: int
    event_rating: int           # 1-5
    mentor_rating: Optional[int] = None
    judging_rating: int         # 1-5
    comment: Optional[str] = None


# ---------------------------------------------------------------------------
# POST /feedback/submit
# ---------------------------------------------------------------------------
@router.post("/feedback/submit")
def submit_feedback(payload: FeedbackSubmit, db: Session = Depends(get_db)):
    # Validate participant exists
    participant = db.query(Participant).filter(Participant.id == payload.participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    # Prevent duplicate submissions
    existing = db.query(Feedback).filter(Feedback.participant_id == payload.participant_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted.")

    # Validate ratings are 1-5
    for field, val in [("event_rating", payload.event_rating), ("judging_rating", payload.judging_rating)]:
        if val < 1 or val > 5:
            raise HTTPException(status_code=400, detail=f"{field} must be between 1 and 5.")
    if payload.mentor_rating is not None and (payload.mentor_rating < 1 or payload.mentor_rating > 5):
        raise HTTPException(status_code=400, detail="mentor_rating must be between 1 and 5.")

    feedback = Feedback(
        participant_id=payload.participant_id,
        event_rating=payload.event_rating,
        mentor_rating=payload.mentor_rating,
        judging_rating=payload.judging_rating,
        comment=payload.comment,
    )
    db.add(feedback)

    # Log the action
    log = ActivityLog(
        action="FEEDBACK_SUBMITTED",
        description=f"Participant #{payload.participant_id} submitted post-event feedback.",
        performed_by=participant.name,
        target_entity="Feedback",
        target_id=payload.participant_id,
    )
    db.add(log)
    db.commit()

    return {"message": "Feedback submitted successfully. Thank you!"}


# ---------------------------------------------------------------------------
# GET /feedback/summary  — committee view
# ---------------------------------------------------------------------------
@router.get("/feedback/summary")
def get_feedback_summary(db: Session = Depends(get_db)):
    all_feedback = db.query(Feedback).all()

    if not all_feedback:
        return {
            "total_responses": 0,
            "avg_event_rating": None,
            "avg_mentor_rating": None,
            "avg_judging_rating": None,
            "comments": [],
            "breakdown": {"event": {}, "mentor": {}, "judging": {}},
        }

    total = len(all_feedback)

    def safe_avg(values):
        vals = [v for v in values if v is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    def breakdown(values):
        vals = [v for v in values if v is not None]
        result = {}
        for i in range(1, 6):
            result[str(i)] = vals.count(i)
        return result

    event_ratings   = [f.event_rating for f in all_feedback]
    mentor_ratings  = [f.mentor_rating for f in all_feedback]
    judging_ratings = [f.judging_rating for f in all_feedback]

    # Enrich comments with participant name
    comments = []
    for f in all_feedback:
        if f.comment and f.comment.strip():
            p = db.query(Participant).filter(Participant.id == f.participant_id).first()
            comments.append({
                "participant_name": p.name if p else f"#{f.participant_id}",
                "comment": f.comment,
                "event_rating": f.event_rating,
                "mentor_rating": f.mentor_rating,
                "judging_rating": f.judging_rating,
                "submitted_at": f.created_at.isoformat() if f.created_at else None,
            })

    return {
        "total_responses": total,
        "avg_event_rating": safe_avg(event_ratings),
        "avg_mentor_rating": safe_avg(mentor_ratings),
        "avg_judging_rating": safe_avg(judging_ratings),
        "comments": comments,
        "breakdown": {
            "event": breakdown(event_ratings),
            "mentor": breakdown(mentor_ratings),
            "judging": breakdown(judging_ratings),
        },
    }


# ---------------------------------------------------------------------------
# GET /feedback/check/{participant_id}  — check if already submitted
# ---------------------------------------------------------------------------
@router.get("/feedback/check/{participant_id}")
def check_feedback(participant_id: int, db: Session = Depends(get_db)):
    existing = db.query(Feedback).filter(Feedback.participant_id == participant_id).first()
    return {"submitted": existing is not None}