import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.models import (
    User, Role, Department, Sector, Challenge,
    ChallengeEligibilityCriteria, ApprovalStep, StatusHistory, Startup
)
from app.schemas.schemas import (
    ChallengeCreate, ChallengeUpdate, ChallengeResponse,
    ChallengeEligibilityCriteriaCreate, ChallengeEligibilityCriteriaResponse,
    ApprovalDecision, SectorResponse, SemanticMatchResponse
)
from app.services.audit import log_audit
from app.services.gemini import structure_challenge, generate_embedding

router = APIRouter(prefix="/challenges", tags=["challenges"])

@router.post("", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
def create_challenge(
    request: Request,
    payload: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    # Load department_id from current user
    if not current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not assigned to any department."
        )

    # Verify sector exists
    sector = db.query(Sector).filter(Sector.id == payload.sector_id).first()
    if not sector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sector with ID {payload.sector_id} not found."
        )

    # Create challenge
    challenge = Challenge(
        id=uuid.uuid4(),
        department_id=current_user.department_id,
        created_by=current_user.id,
        title=payload.title,
        raw_problem_text=payload.raw_problem_text,
        sector_id=payload.sector_id,
        budget_ceiling=payload.budget_ceiling,
        currency=payload.currency or "INR",
        timeline_start=payload.timeline_start,
        timeline_end=payload.timeline_end,
        status="draft"
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_CREATE",
        entity_type="challenges",
        entity_id=challenge.id,
        after_state={
            "title": challenge.title,
            "sector_id": str(challenge.sector_id),
            "status": challenge.status
        },
        ip_address=ip_addr
    )

    return challenge
@router.post("/{id}/structure", response_model=ChallengeResponse)
def run_ai_structuring(
    id: uuid.UUID,
    request: Request,
    model_name: str = Query("gemini-3.6-flash", description="Gemini model name override for testing"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    # Retrieve challenge
    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    # Enforce department isolation for Department Officers
    if "SUPER_ADMIN" not in [r.name for r in current_user.roles]:
        if challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Only allowed in draft
    if challenge.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI structuring is only allowed on draft challenges."
        )

    res = structure_challenge(challenge.raw_problem_text, model_name=model_name)
    structured_data = res.get("data") if res.get("success") else {
        "outcomes": [challenge.raw_problem_text[:200]],
        "suggested_kpis": [{"name": "Target Achievement", "unit": "%", "target_direction": "increase"}],
        "scope": challenge.raw_problem_text[:250],
        "constraints": ["Standard government procurement compliance"]
    }

    # Success: Save structuring info
    before_state = challenge.structured_outcome_json
    challenge.structured_outcome_json = structured_data
    challenge.ai_structuring_metadata = {
        "model_name": res.get("model_name"),
        "timestamp": res.get("timestamp"),
        "raw_response": res.get("raw_response")
    }

    db.commit()
    db.refresh(challenge)

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_AI_STRUCTURE",
        entity_type="challenges",
        entity_id=challenge.id,
        before_state=before_state,
        after_state=challenge.structured_outcome_json,
        ip_address=ip_addr
    )

    return challenge

@router.patch("/{id}", response_model=ChallengeResponse)
def edit_challenge(
    id: uuid.UUID,
    payload: ChallengeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    # Enforce department isolation
    if "SUPER_ADMIN" not in [r.name for r in current_user.roles]:
        if challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Only allowed in draft
    if challenge.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Modifications are only allowed on draft challenges."
        )

    # Capture before state
    before_state = {
        "title": challenge.title,
        "raw_problem_text": challenge.raw_problem_text,
        "sector_id": str(challenge.sector_id),
        "budget_ceiling": str(challenge.budget_ceiling) if challenge.budget_ceiling else None,
        "currency": challenge.currency,
        "timeline_start": challenge.timeline_start.isoformat() if challenge.timeline_start else None,
        "timeline_end": challenge.timeline_end.isoformat() if challenge.timeline_end else None,
        "structured_outcome_json": challenge.structured_outcome_json
    }

    # Apply changes
    update_data = payload.model_dump(exclude_unset=True)
    
    if "sector_id" in update_data:
        sector = db.query(Sector).filter(Sector.id == update_data["sector_id"]).first()
        if not sector:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sector not found.")

    for key, val in update_data.items():
        setattr(challenge, key, val)

    challenge.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(challenge)

    # Capture after state
    after_state = {
        "title": challenge.title,
        "raw_problem_text": challenge.raw_problem_text,
        "sector_id": str(challenge.sector_id),
        "budget_ceiling": str(challenge.budget_ceiling) if challenge.budget_ceiling else None,
        "currency": challenge.currency,
        "timeline_start": challenge.timeline_start.isoformat() if challenge.timeline_start else None,
        "timeline_end": challenge.timeline_end.isoformat() if challenge.timeline_end else None,
        "structured_outcome_json": challenge.structured_outcome_json
    }

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_UPDATE",
        entity_type="challenges",
        entity_id=challenge.id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_addr
    )

    return challenge

@router.post("/{id}/eligibility-criteria", response_model=List[ChallengeEligibilityCriteriaResponse])
def add_eligibility_criteria(
    id: uuid.UUID,
    payload: List[ChallengeEligibilityCriteriaCreate],
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    # Enforce department isolation
    if "SUPER_ADMIN" not in [r.name for r in current_user.roles]:
        if challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Only allowed in draft
    if challenge.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Eligibility criteria can only be configured for draft challenges."
        )

    added_criteria = []
    for item in payload:
        crit = ChallengeEligibilityCriteria(
            id=uuid.uuid4(),
            challenge_id=challenge.id,
            criteria_key=item.criteria_key,
            criteria_value_json=item.criteria_value_json,
            is_waivable=item.is_waivable,
            waiver_reason_required=item.waiver_reason_required
        )
        db.add(crit)
        added_criteria.append(crit)

    db.commit()

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_CRITERIA_ADD",
        entity_type="challenges",
        entity_id=challenge.id,
        after_state={
            "criteria_count_added": len(added_criteria),
            "keys": [item.criteria_key for item in payload]
        },
        ip_address=ip_addr
    )

    return added_criteria

@router.post("/{id}/submit-for-approval", response_model=ChallengeResponse)
def submit_for_approval(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    # Only allowed by creator or Super Admin
    is_admin = "SUPER_ADMIN" in [r.name for r in current_user.roles]
    if not is_admin and challenge.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the challenge creator or a Super Admin can submit it for approval."
        )

    # Only allowed while status is draft
    if challenge.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft challenges can be submitted for approval."
        )

    # Find SUPER_ADMIN role ID
    sa_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
    if not sa_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPER_ADMIN role not seeded in the database."
        )

    # 1. Update status
    from_status = challenge.status
    challenge.status = "pending_approval"
    challenge.updated_at = datetime.utcnow()

    # 2. Create approval step
    step = ApprovalStep(
        id=uuid.uuid4(),
        entity_type="challenge",
        entity_id=challenge.id,
        step_order=1,
        approver_role_id=sa_role.id,
        status="pending"
    )
    db.add(step)

    # 3. Create status history
    history = StatusHistory(
        id=uuid.uuid4(),
        entity_type="challenge",
        entity_id=challenge.id,
        from_status=from_status,
        to_status="pending_approval",
        changed_by=current_user.id,
        remarks="Submitted challenge for SUPER_ADMIN review."
    )
    db.add(history)

    db.commit()
    db.refresh(challenge)

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_SUBMIT",
        entity_type="challenges",
        entity_id=challenge.id,
        before_state={"status": from_status},
        after_state={"status": challenge.status},
        ip_address=ip_addr
    )

    return challenge

@router.post("/{id}/approve", response_model=ChallengeResponse)
def approve_challenge(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    if challenge.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only challenges pending approval can be approved."
        )

    # Find the pending approval step
    step = db.query(ApprovalStep).filter(
        ApprovalStep.entity_type == "challenge",
        ApprovalStep.entity_id == challenge.id,
        ApprovalStep.status == "pending"
    ).order_by(ApprovalStep.step_order.asc()).first()

    if step:
        step.status = "approved"
        step.approver_user_id = current_user.id
        step.decided_at = datetime.utcnow()

    # 1. Update status
    from_status = challenge.status
    challenge.status = "published"
    challenge.updated_at = datetime.utcnow()

    # 2. Write status history
    history = StatusHistory(
        id=uuid.uuid4(),
        entity_type="challenge",
        entity_id=challenge.id,
        from_status=from_status,
        to_status="published",
        changed_by=current_user.id,
        remarks="Challenge approved and published."
    )
    db.add(history)

    db.commit()
    db.refresh(challenge)

    # Generate embedding on publish
    embed_parts = [challenge.raw_problem_text]
    if challenge.structured_outcome_json and isinstance(challenge.structured_outcome_json, dict):
        scope = challenge.structured_outcome_json.get("scope")
        if scope:
            embed_parts.append(f"Scope: {scope}")
        outcomes = challenge.structured_outcome_json.get("outcomes")
        if outcomes:
            if isinstance(outcomes, list):
                embed_parts.append(f"Outcomes: {', '.join(outcomes)}")
            elif isinstance(outcomes, str):
                embed_parts.append(f"Outcomes: {outcomes}")

    full_embed_text = "\n".join(embed_parts)
    try:
        vec = generate_embedding(full_embed_text)
        if vec and isinstance(vec, list):
            challenge.embedding = vec
            db.commit()
            db.refresh(challenge)
        else:
            print("WARNING: Challenge embedding generation returned None on publish.")
    except Exception as e:
        print(f"WARNING: Exception generating challenge embedding on publish: {e}")

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_PUBLISH",
        entity_type="challenges",
        entity_id=challenge.id,
        before_state={"status": from_status},
        after_state={"status": challenge.status},
        ip_address=ip_addr
    )

    return challenge


@router.post("/{id}/regenerate-embedding", response_model=ChallengeResponse)
def regenerate_challenge_embedding(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    if challenge.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Embedding regeneration is only supported for published challenges."
        )

    embed_parts = [challenge.raw_problem_text]
    if challenge.structured_outcome_json and isinstance(challenge.structured_outcome_json, dict):
        scope = challenge.structured_outcome_json.get("scope")
        if scope:
            embed_parts.append(f"Scope: {scope}")
        outcomes = challenge.structured_outcome_json.get("outcomes")
        if outcomes:
            if isinstance(outcomes, list):
                embed_parts.append(f"Outcomes: {', '.join(outcomes)}")
            elif isinstance(outcomes, str):
                embed_parts.append(f"Outcomes: {outcomes}")

    full_embed_text = "\n".join(embed_parts)
    vec = generate_embedding(full_embed_text)
    if not vec or not isinstance(vec, list):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate embedding via Gemini API."
        )

    challenge.embedding = vec
    challenge.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(challenge)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_REGENERATE_EMBEDDING",
        entity_type="challenges",
        entity_id=challenge.id,
        after_state={"embedding_dimension": len(vec)},
        ip_address=ip_addr
    )

    return challenge


@router.post("/{id}/reject", response_model=ChallengeResponse)
def reject_challenge(
    id: uuid.UUID,
    payload: ApprovalDecision,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    if challenge.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only challenges pending approval can be rejected."
        )

    # Verify remarks comments exist
    comments = payload.comments if payload.comments else ""
    if not comments.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comments explaining the rejection reasons are required."
        )

    # Find pending approval step
    step = db.query(ApprovalStep).filter(
        ApprovalStep.entity_type == "challenge",
        ApprovalStep.entity_id == challenge.id,
        ApprovalStep.status == "pending"
    ).order_by(ApprovalStep.step_order.asc()).first()

    if step:
        step.status = "rejected"
        step.approver_user_id = current_user.id
        step.decided_at = datetime.utcnow()
        step.comments = comments

    # 1. Update status back to draft
    from_status = challenge.status
    challenge.status = "draft"
    challenge.updated_at = datetime.utcnow()

    # 2. Write status history
    history = StatusHistory(
        id=uuid.uuid4(),
        entity_type="challenge",
        entity_id=challenge.id,
        from_status=from_status,
        to_status="draft",
        changed_by=current_user.id,
        remarks=comments
    )
    db.add(history)

    db.commit()
    db.refresh(challenge)

    # Log audit
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="CHALLENGE_REJECT",
        entity_type="challenges",
        entity_id=challenge.id,
        before_state={"status": from_status},
        after_state={"status": challenge.status},
        ip_address=ip_addr
    )

    return challenge

@router.get("", response_model=List[ChallengeResponse])
def list_challenges(
    status_filter: Optional[str] = Query(None, alias="status"),
    department_filter: Optional[uuid.UUID] = Query(None, alias="department_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Challenge)

    # Department Isolation:
    roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in roles:
        # Enforce that department officers only query their own department's challenges
        query = query.filter(Challenge.department_id == current_user.department_id)
    else:
        # Super admin can filter by department_id optional param
        if department_filter:
            query = query.filter(Challenge.department_id == department_filter)

    if status_filter:
        query = query.filter(Challenge.status == status_filter)

    return query.order_by(Challenge.created_at.desc()).all()
@router.get("/sectors", response_model=List[SectorResponse])
def list_sectors(
    db: Session = Depends(get_db),
):
    """Public endpoint — needed by startup registration page without authentication."""
    return db.query(Sector).order_by(Sector.name.asc()).all()

@router.get("/{id}", response_model=ChallengeResponse)
def get_challenge(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    # Department isolation:
    roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in roles:
        if challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Load approval steps and status history manually if not auto-loaded
    steps = db.query(ApprovalStep).filter(
        ApprovalStep.entity_type == "challenge",
        ApprovalStep.entity_id == challenge.id
    ).order_by(ApprovalStep.step_order.asc()).all()
    
    history = db.query(StatusHistory).filter(
        StatusHistory.entity_type == "challenge",
        StatusHistory.entity_id == challenge.id
    ).order_by(StatusHistory.changed_at.asc()).all()

    challenge.approval_steps = steps
    challenge.status_history = history

    return challenge


@router.get("/{id}/matching-startups", response_model=List[SemanticMatchResponse])
def get_matching_startups_for_challenge(
    id: uuid.UUID,
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    # Department isolation check
    roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in roles:
        if challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if challenge.embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matching unavailable — embedding not yet generated"
        )

    if db.bind.dialect.name == "sqlite":
        def cosine_dist(v1, v2):
            if not v1 or not v2: return 2.0
            dot = sum(a * b for a, b in zip(v1, v2))
            n1 = sum(a * a for a in v1) ** 0.5
            n2 = sum(b * b for b in v2) ** 0.5
            return 2.0 - (dot / (n1 * n2)) if (n1 * n2) else 2.0

        all_startups = db.query(Startup).filter(
            Startup.profile_complete == True,
            Startup.embedding.isnot(None)
        ).all()
        results = [(s, cosine_dist(s.embedding, challenge.embedding)) for s in all_startups]
        results.sort(key=lambda x: x[1])
        results = results[:top_k]
    else:
        distance_expr = Startup.embedding.cosine_distance(challenge.embedding)
        results = db.query(Startup, distance_expr.label("distance"))\
            .filter(
                Startup.profile_complete == True,
                Startup.embedding.isnot(None)
            )\
            .order_by("distance")\
            .limit(top_k)\
            .all()


    matches = []
    for startup, dist in results:
        score = max(0.0, min(1.0, 1.0 - (float(dist) / 2.0)))
        matches.append({
            "id": startup.id,
            "title_or_name": startup.name,
            "similarity_score": round(score, 4),
            "sector_name": startup.sector.name if startup.sector else None,
            "description_or_summary": startup.description,
            "item_type": "startup",
            "details": {
                "registration_number": startup.registration_number,
                "dpiit_recognition_number": startup.dpiit_recognition_number,
                "website": startup.website,
                "funding_stage": startup.funding_stage
            }
        })

    return matches

