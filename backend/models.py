from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    skill = Column(String, nullable=False)
    background = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    member_ids = Column(String, nullable=False)
    rationale = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)


class Stage(Base):
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="PENDING")
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CommunicationLog(Base):
    __tablename__ = "communication_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default="DRAFT")
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    judge_name = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    anomaly_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    description = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)