import uuid
import json
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import AuditLog


def _sanitize_for_json(data: Optional[dict]) -> Optional[dict]:
    if data is None:
        return None
    try:
        return json.loads(json.dumps(data, default=str))
    except Exception:
        return {k: str(v) for k, v in data.items()}


def log_audit(
    db: Session,
    actor_user_id: Optional[uuid.UUID],
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    before_state: Optional[dict] = None,
    after_state: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    db_log = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_state=_sanitize_for_json(before_state),
        after_state=_sanitize_for_json(after_state),
        ip_address=ip_address
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

