from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import ActivityLog

router = APIRouter()

def log_action(
    db: Session, 
    action: str, 
    description: str, 
    performed_by: str = "committee",
    target_entity: Optional[str] = None,
    target_id: Optional[int] = None,
    ip_address: Optional[str] = None
):
    entry = ActivityLog(
        action=action,
        description=description,
        performed_by=performed_by,
        target_entity=target_entity,
        target_id=target_id,
        ip_address=ip_address
    )
    db.add(entry)
    db.commit()

@router.post("/activity/log")
def create_log(
    request: Request,
    action: str, 
    description: str, 
    performed_by: str = "committee", 
    target_entity: Optional[str] = None,
    target_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Capture IP address automatically from the request
    client_ip = request.client.host if request.client else None
    
    log_action(db, action, description, performed_by, target_entity, target_id, client_ip)
    return {"message": "Audit action logged successfully"}

@router.get("/activity")
def get_activity_log(db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "description": log.description,
            "performed_by": log.performed_by,
            "target_entity": log.target_entity,
            "target_id": log.target_id,
            "ip_address": log.ip_address,
            "created_at": log.created_at
        }
        for log in logs
    ]