import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import User, AuditLog
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    actor_user_id: Optional[uuid.UUID] = Query(None, description="Filter by actor user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. users)"),
    start_date: Optional[datetime] = Query(None, description="Filter by logs created at or after this date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="Filter by logs created at or before this date (ISO format)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    query = db.query(AuditLog)
    
    if actor_user_id is not None:
        query = query.filter(AuditLog.actor_user_id == actor_user_id)
    if entity_type is not None:
        query = query.filter(AuditLog.entity_type == entity_type)
    if start_date is not None:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date is not None:
        query = query.filter(AuditLog.created_at <= end_date)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs
