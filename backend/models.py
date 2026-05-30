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

    # Extended profile
    study_year = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    prior_hackathons = Column(Integer, nullable=True)
    domain_interest = Column(String, nullable=True)
    tools_known = Column(String, nullable=True)
    availability = Column(String, nullable=True)
    role_preference = Column(String, nullable=True)

    # Portfolio
    tech_stack = Column(String, nullable=True)
    project_link = Column(String, nullable=True)
    resume_link = Column(String, nullable=True)

    # Registration tracking
    # source: "csv" = uploaded by committee | "self" = self-registered via signup
    source = Column(String, default="csv", nullable=False)
    # registration_status: "approved" (csv default) | "pending" (self-reg) | "rejected"
    registration_status = Column(String, default="approved", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    member_ids = Column(String, nullable=False)
    rationale = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    event_config_id = Column(Integer, ForeignKey("event_configs.id"), nullable=True)
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
    # status values: DRAFT | PENDING_APPROVAL | SENT | REJECTED
    status = Column(String, default="DRAFT")
    comm_type = Column(String, default="MANUAL", nullable=True)
    sent_at = Column(DateTime, nullable=True)
    # batch_id groups all emails from one trigger action so committee can
    # preview and approve/reject the whole batch at once
    batch_id = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
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
    target_entity = Column(String, nullable=True) 
    target_id = Column(Integer, nullable=True)    
    ip_address = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class EventConfig(Base):
    __tablename__ = "event_configs"

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String, nullable=False)
    stages = Column(String, nullable=False)
    team_formation = Column(String, nullable=False)
    scoring = Column(String, nullable=False)
    communication_touchpoints = Column(String, nullable=False)
    approval_requirements = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    current_stage_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)