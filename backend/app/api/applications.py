import uuid
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import (
    User, Startup, Challenge, ChallengeApplication, EligibilityCheckResult,
    ChallengeEligibilityCriteria, StatusHistory
)
from app.schemas.schemas import (
    ChallengeApplicationResponse, EligibilityCheckResultResponse,
    EligibilityOverrideRequest, ApplicationRejectRequest
)
from app.services.audit import log_audit
from app.services.eligibility import evaluate_criteria

router = APIRouter(tags=["applications"])


@router.post("/challenges/{id}/applications", response_model=ChallengeApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_challenge(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STARTUP_USER"))
):
    ip_addr = request.client.host if request.client else None

    # Fetch startup
    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a registered startup profile."
        )

    # Fetch challenge
    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    if challenge.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Applications can only be submitted to published challenges."
        )

    # Check duplicate application
    existing_app = db.query(ChallengeApplication).filter(
        ChallengeApplication.challenge_id == challenge.id,
        ChallengeApplication.startup_id == startup.id
    ).first()

    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Startup has already submitted an application to this challenge."
        )

    # Calculate AI match score from Module 3 pgvector distance logic
    match_score = None
    match_explanation = None
    if challenge.embedding is not None and startup.embedding is not None:
        try:
            if db.bind.dialect.name == "sqlite":
                v1, v2 = challenge.embedding, startup.embedding
                dot = sum(a * b for a, b in zip(v1, v2))
                n1 = sum(a * a for a in v1) ** 0.5
                n2 = sum(b * b for b in v2) ** 0.5
                sim_score = (dot / (n1 * n2)) if (n1 * n2) else 0.0
                match_score = round(Decimal(max(0.0, sim_score) * 100), 2)
                match_explanation = f"Captured similarity score of {sim_score*100:.1f}% at time of application."
            else:
                distance_stmt = select(
                    Challenge.embedding.cosine_distance(startup.embedding)
                ).where(Challenge.id == challenge.id)
                distance = db.execute(distance_stmt).scalar()
                if distance is not None:
                    sim_score = max(0.0, 1.0 - (float(distance) / 2.0))
                    match_score = round(Decimal(sim_score * 100), 2)
                    match_explanation = f"Captured pgvector similarity score of {sim_score*100:.1f}% at time of application."
        except Exception as e:
            print(f"WARNING: Exception computing match score on apply: {e}")


    app_obj = ChallengeApplication(
        challenge_id=challenge.id,
        startup_id=startup.id,
        status="submitted",
        ai_match_score=match_score,
        ai_match_explanation=match_explanation
    )
    db.add(app_obj)
    db.commit()
    db.refresh(app_obj)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="application.submit",
        entity_type="challenge_applications",
        entity_id=app_obj.id,
        after_state={"challenge_id": str(challenge.id), "startup_id": str(startup.id), "status": "submitted"},
        ip_address=ip_addr
    )

    return app_obj


@router.post("/applications/{id}/run-eligibility-check", response_model=ChallengeApplicationResponse)
def run_eligibility_check(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    app_obj = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.challenge),
        joinedload(ChallengeApplication.startup)
    ).filter(ChallengeApplication.id == id).first()

    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    # Department officer guard
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if app_obj.challenge.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department officers can only run eligibility checks for challenges in their department."
            )

    criteria_list = db.query(ChallengeEligibilityCriteria).filter(
        ChallengeEligibilityCriteria.challenge_id == app_obj.challenge_id
    ).all()

    before_state = {"status": app_obj.status, "eligibility_results_count": len(app_obj.eligibility_results)}

    for crit in criteria_list:
        rules_passed, ai_passed, ai_res, final_p = evaluate_criteria(db, app_obj, crit)

        existing_res = db.query(EligibilityCheckResult).filter(
            EligibilityCheckResult.application_id == app_obj.id,
            EligibilityCheckResult.criteria_id == crit.id
        ).first()

        if existing_res:
            existing_res.rules_engine_passed = rules_passed
            existing_res.ai_verification_passed = ai_passed
            existing_res.ai_verification_result = ai_res
            existing_res.final_passed = final_p
            existing_res.checked_at = datetime.utcnow()
        else:
            new_res = EligibilityCheckResult(
                application_id=app_obj.id,
                criteria_id=crit.id,
                rules_engine_passed=rules_passed,
                ai_verification_passed=ai_passed,
                ai_verification_result=ai_res,
                final_passed=final_p
            )
            db.add(new_res)

    # Move application status to under_review if currently submitted
    from_status = app_obj.status
    if app_obj.status == "submitted":
        app_obj.status = "under_review"
        history = StatusHistory(
            entity_type="challenge_applications",
            entity_id=app_obj.id,
            from_status=from_status,
            to_status="under_review",
            changed_by=current_user.id,
            remarks="Automated eligibility check initiated."
        )
        db.add(history)

    db.commit()
    db.refresh(app_obj)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="application.eligibility_check",
        entity_type="challenge_applications",
        entity_id=app_obj.id,
        before_state=before_state,
        after_state={"status": app_obj.status, "criteria_checked": len(criteria_list)},
        ip_address=ip_addr
    )

    return app_obj


@router.get("/applications/{id}/eligibility", response_model=List[EligibilityCheckResultResponse])
def get_application_eligibility(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app_obj = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.challenge),
        joinedload(ChallengeApplication.startup)
    ).filter(ChallengeApplication.id == id).first()

    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    user_roles = [r.name for r in current_user.roles]
    if "STARTUP_USER" in user_roles and len(user_roles) == 1:
        if app_obj.startup.contact_user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    elif "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if app_obj.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    results = db.query(EligibilityCheckResult).options(
        joinedload(EligibilityCheckResult.criteria),
        joinedload(EligibilityCheckResult.checker)
    ).filter(EligibilityCheckResult.application_id == app_obj.id).all()

    response_data = []
    for r in results:
        needs_review = (r.final_passed is None and not r.waived)
        item = EligibilityCheckResultResponse.model_validate(r)
        item.needs_human_review = needs_review
        response_data.append(item)

    return response_data


@router.patch("/applications/{id}/eligibility/{criteria_id}", response_model=EligibilityCheckResultResponse)
def override_eligibility_criteria(
    id: uuid.UUID,
    criteria_id: uuid.UUID,
    payload: EligibilityOverrideRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    app_obj = db.query(ChallengeApplication).options(joinedload(ChallengeApplication.challenge)).filter(
        ChallengeApplication.id == id
    ).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if app_obj.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    result = db.query(EligibilityCheckResult).filter(
        EligibilityCheckResult.application_id == app_obj.id,
        EligibilityCheckResult.criteria_id == criteria_id
    ).first()

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eligibility criteria result not found.")

    before_state = {
        "final_passed": result.final_passed,
        "waived": result.waived,
        "waiver_justification": result.waiver_justification,
        "checked_by": str(result.checked_by) if result.checked_by else None
    }

    if payload.final_passed is not None:
        result.final_passed = payload.final_passed

    if payload.waived is not None:
        result.waived = payload.waived
        if payload.waived and payload.waiver_justification:
            result.waiver_justification = payload.waiver_justification
        elif payload.waived and not payload.waiver_justification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A waiver justification is required when waiving an eligibility criteria."
            )

    result.checked_by = current_user.id
    result.checked_at = datetime.utcnow()

    db.commit()
    db.refresh(result)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="application.eligibility_override",
        entity_type="eligibility_check_results",
        entity_id=result.id,
        before_state=before_state,
        after_state={
            "final_passed": result.final_passed,
            "waived": result.waived,
            "waiver_justification": result.waiver_justification,
            "checked_by": str(result.checked_by)
        },
        ip_address=ip_addr
    )

    needs_review = (result.final_passed is None and not result.waived)
    resp = EligibilityCheckResultResponse.model_validate(result)
    resp.needs_human_review = needs_review
    return resp


@router.post("/applications/{id}/shortlist", response_model=ChallengeApplicationResponse)
def shortlist_application(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    app_obj = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.challenge)
    ).filter(ChallengeApplication.id == id).first()

    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if app_obj.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Fetch all criteria for parent challenge
    chal_criteria = db.query(ChallengeEligibilityCriteria).filter(
        ChallengeEligibilityCriteria.challenge_id == app_obj.challenge_id
    ).all()

    # Fetch all eligibility check results for this application
    check_results = db.query(EligibilityCheckResult).options(
        joinedload(EligibilityCheckResult.criteria)
    ).filter(EligibilityCheckResult.application_id == app_obj.id).all()

    results_map = {r.criteria_id: r for r in check_results}

    unresolved_keys = []
    for c in chal_criteria:
        res = results_map.get(c.id)
        if not res or not (res.final_passed is True or res.waived is True):
            unresolved_keys.append(c.criteria_key)

    if unresolved_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot shortlist application: unresolved eligibility criteria exist: [{', '.join(unresolved_keys)}]."
        )

    from_status = app_obj.status
    app_obj.status = "shortlisted"

    history = StatusHistory(
        entity_type="challenge_applications",
        entity_id=app_obj.id,
        from_status=from_status,
        to_status="shortlisted",
        changed_by=current_user.id,
        remarks="Application shortlisted after full eligibility resolution."
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="application.shortlist",
        entity_type="challenge_applications",
        entity_id=app_obj.id,
        before_state={"status": from_status},
        after_state={"status": "shortlisted"},
        ip_address=ip_addr
    )

    return app_obj


@router.post("/applications/{id}/reject", response_model=ChallengeApplicationResponse)
def reject_application(
    id: uuid.UUID,
    payload: ApplicationRejectRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    app_obj = db.query(ChallengeApplication).options(joinedload(ChallengeApplication.challenge)).filter(
        ChallengeApplication.id == id
    ).first()

    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if app_obj.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    from_status = app_obj.status
    app_obj.status = "rejected"

    history = StatusHistory(
        entity_type="challenge_applications",
        entity_id=app_obj.id,
        from_status=from_status,
        to_status="rejected",
        changed_by=current_user.id,
        remarks=payload.reason
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="application.reject",
        entity_type="challenge_applications",
        entity_id=app_obj.id,
        before_state={"status": from_status},
        after_state={"status": "rejected", "reason": payload.reason},
        ip_address=ip_addr
    )

    return app_obj


@router.get("/challenges/{id}/applications", response_model=List[ChallengeApplicationResponse])
def list_challenge_applications(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    applications = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.startup).joinedload(Startup.sector),
        joinedload(ChallengeApplication.eligibility_results).joinedload(EligibilityCheckResult.criteria)
    ).filter(ChallengeApplication.challenge_id == id).all()

    return applications


@router.get("/startups/me/applications", response_model=List[ChallengeApplicationResponse])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STARTUP_USER"))
):
    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        return []

    applications = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.challenge).joinedload(Challenge.department),
        joinedload(ChallengeApplication.eligibility_results).joinedload(EligibilityCheckResult.criteria)
    ).filter(ChallengeApplication.startup_id == startup.id).all()

    return applications
