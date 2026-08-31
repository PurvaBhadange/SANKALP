import uuid
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.models import (
    User,
    Role,
    Challenge,
    ChallengeApplication,
    EvaluationCriteria,
    EvaluationPanel,
    EvaluationPanelMember,
    EvaluationScore,
    ScoreOutlierFlag,
    EvaluatorBriefing,
    Startup
)
from app.schemas.schemas import (
    EvaluationCriteriaCreate,
    EvaluationCriteriaResponse,
    EvaluationPanelCreate,
    EvaluationPanelResponse,
    SubmitScoresRequest,
    EvaluationScoreResponse,
    ScoreChainVerificationResponse,
    ScoreOutlierFlagResponse,
    OutlierFlagReviewRequest,
    EvaluatorBriefingResponse,
    ApplicationRankingItem
)
from app.core.security import require_role, get_current_user
from app.services.audit import log_audit
from app.services.score_chain import compute_score_hash, get_previous_score_hash, verify_score_chain
from app.services.outlier import check_and_flag_outliers
from app.services.gemini import generate_evaluator_briefing

router = APIRouter(prefix="", tags=["module5-evaluation"])


# -------------------------------------------------------------------
# 1. EVALUATION CRITERIA ENDPOINTS
# -------------------------------------------------------------------

@router.post("/challenges/{id}/evaluation-criteria", response_model=List[EvaluationCriteriaResponse])
def create_evaluation_criteria(
    id: uuid.UUID,
    payload: List[EvaluationCriteriaCreate],
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    is_admin = "SUPER_ADMIN" in [r.name for r in current_user.roles]
    if not is_admin and challenge.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Validate weight sum == 100.00
    existing_criteria = db.query(EvaluationCriteria).filter(EvaluationCriteria.challenge_id == id).all()
    existing_weight_sum = sum([c.weight for c in existing_criteria])
    new_weight_sum = sum([item.weight for item in payload])

    total_weight = existing_weight_sum + new_weight_sum
    if abs(float(total_weight) - 100.0) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total evaluation criteria weights for a challenge must sum to exactly 100.00 (Current total: {total_weight})."
        )

    added = []
    for item in payload:
        crit = EvaluationCriteria(
            id=uuid.uuid4(),
            challenge_id=id,
            name=item.name,
            weight=item.weight,
            max_score=item.max_score
        )
        db.add(crit)
        added.append(crit)

    db.commit()

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="evaluation_criteria.create",
        entity_type="challenges",
        entity_id=id,
        after_state={"count_added": len(added), "total_weight": float(total_weight)},
        ip_address=ip_addr
    )

    return added


@router.get("/challenges/{id}/evaluation-criteria", response_model=List[EvaluationCriteriaResponse])
def get_evaluation_criteria(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(EvaluationCriteria).filter(EvaluationCriteria.challenge_id == id).all()


# -------------------------------------------------------------------
# 2. EVALUATION PANELS ENDPOINTS
# -------------------------------------------------------------------

@router.post("/panels", response_model=EvaluationPanelResponse)
def create_evaluation_panel(
    payload: EvaluationPanelCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    challenge = db.query(Challenge).filter(Challenge.id == payload.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    existing_panel = db.query(EvaluationPanel).filter(EvaluationPanel.challenge_id == payload.challenge_id).first()
    if existing_panel:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An evaluation panel already exists for this challenge.")

    evaluator_users = []
    for uid in payload.evaluator_user_ids:
        u = db.query(User).options(joinedload(User.roles)).filter(User.id == uid).first()
        if not u:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {uid} not found.")
        user_roles = [r.name for r in u.roles]
        if "EVALUATOR" not in user_roles:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {u.email} does not possess EVALUATOR role.")
        evaluator_users.append(u)

    panel = EvaluationPanel(
        id=uuid.uuid4(),
        challenge_id=payload.challenge_id,
        name=payload.name,
        scoring_status="open"
    )
    panel.members.extend(evaluator_users)

    db.add(panel)
    db.commit()
    db.refresh(panel)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="panel.create",
        entity_type="evaluation_panels",
        entity_id=panel.id,
        after_state={"name": panel.name, "member_count": len(evaluator_users)},
        ip_address=ip_addr
    )

    return panel


@router.get("/challenges/{id}/panel", response_model=EvaluationPanelResponse)
def get_challenge_panel(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    panel = db.query(EvaluationPanel).options(
        joinedload(EvaluationPanel.members)
    ).filter(EvaluationPanel.challenge_id == id).first()

    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation panel not configured for this challenge.")
    return panel


# -------------------------------------------------------------------
# 3. SCORE SUBMISSION & BLIND SCORING ENDPOINTS
# -------------------------------------------------------------------

@router.post("/applications/{id}/scores", response_model=List[EvaluationScoreResponse])
def submit_evaluation_scores(
    id: uuid.UUID,
    payload: SubmitScoresRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EVALUATOR"))
):
    ip_addr = request.client.host if request.client else None

    app_obj = db.query(ChallengeApplication).filter(ChallengeApplication.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if app_obj.status != "shortlisted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scores can only be submitted for shortlisted applications."
        )

    panel = db.query(EvaluationPanel).options(
        joinedload(EvaluationPanel.members)
    ).filter(EvaluationPanel.challenge_id == app_obj.challenge_id).first()

    if not panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No evaluation panel configured for this challenge.")

    panel_member_ids = [m.id for m in panel.members]
    if current_user.id not in panel_member_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not an assigned evaluator for this challenge's panel.")

    if panel.scoring_status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scoring is finalized for this challenge panel. No further score submissions allowed.")

    # Check for duplicate scores prior to insertion
    for item in payload.scores:
        existing = db.query(EvaluationScore).filter(
            EvaluationScore.application_id == id,
            EvaluationScore.evaluator_id == current_user.id,
            EvaluationScore.criteria_id == item.criteria_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Score already submitted for criteria {item.criteria_id}. Re-submissions are not allowed."
            )

    created_scores = []
    for item in payload.scores:
        submitted_at = datetime.utcnow().replace(tzinfo=timezone.utc)
        prev_hash = get_previous_score_hash(db, id)
        row_hash = compute_score_hash(
            application_id=id,
            evaluator_id=current_user.id,
            criteria_id=item.criteria_id,
            score=item.score,
            comments=item.comments,
            submitted_at=submitted_at,
            prev_hash=prev_hash
        )

        score_row = EvaluationScore(
            id=uuid.uuid4(),
            application_id=id,
            evaluator_id=current_user.id,
            criteria_id=item.criteria_id,
            score=Decimal(str(item.score)),
            comments=item.comments,
            submitted_at=submitted_at,
            prev_hash=prev_hash,
            row_hash=row_hash
        )
        db.add(score_row)
        db.flush()
        created_scores.append(score_row)

        # Trigger statistical outlier detection
        check_and_flag_outliers(db, id, item.criteria_id)

    db.commit()

    for s in created_scores:
        db.refresh(s)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="evaluation_scores.submit",
        entity_type="challenge_applications",
        entity_id=id,
        after_state={"scores_count": len(created_scores)},
        ip_address=ip_addr
    )

    return created_scores


@router.get("/applications/{id}/scores", response_model=List[EvaluationScoreResponse])
def get_application_scores(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app_obj = db.query(ChallengeApplication).filter(ChallengeApplication.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    panel = db.query(EvaluationPanel).filter(EvaluationPanel.challenge_id == app_obj.challenge_id).first()

    user_roles = [r.name for r in current_user.roles]
    is_admin_or_officer = "SUPER_ADMIN" in user_roles or "DEPARTMENT_OFFICER" in user_roles

    query = db.query(EvaluationScore).options(
        joinedload(EvaluationScore.evaluator),
        joinedload(EvaluationScore.criteria)
    ).filter(EvaluationScore.application_id == id)

    # BLIND SCORING RULE: If panel is open and user is pure EVALUATOR, hide other evaluators' scores!
    if panel and panel.scoring_status == "open" and not is_admin_or_officer:
        query = query.filter(EvaluationScore.evaluator_id == current_user.id)

    return query.order_by(EvaluationScore.submitted_at.asc()).all()


@router.get("/applications/{id}/scores/verify-integrity", response_model=ScoreChainVerificationResponse)
def verify_application_score_chain(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    app_obj = db.query(ChallengeApplication).filter(ChallengeApplication.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    res = verify_score_chain(db, id)
    return res


# -------------------------------------------------------------------
# 4. AI BRIEFING & OUTLIER FLAGS ENDPOINTS
# -------------------------------------------------------------------

@router.get("/applications/{id}/briefing", response_model=EvaluatorBriefingResponse)
def get_or_generate_briefing(
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

    existing_briefing = db.query(EvaluatorBriefing).filter(
        EvaluatorBriefing.application_id == id,
        EvaluatorBriefing.evaluator_id == current_user.id
    ).first()

    if existing_briefing:
        return existing_briefing

    # Generate new AI briefing
    briefing_res = generate_evaluator_briefing(
        challenge_title=app_obj.challenge.title,
        challenge_outcomes_json=app_obj.challenge.structured_outcome_json,
        startup_name=app_obj.startup.name,
        startup_description=app_obj.startup.description
    )

    briefing_text = briefing_res.get("briefing") if isinstance(briefing_res, dict) else briefing_res

    briefing = EvaluatorBriefing(
        application_id=id,
        evaluator_id=current_user.id,
        briefing_text=briefing_text,
        generated_at=datetime.utcnow()
    )
    db.add(briefing)
    db.commit()
    db.refresh(briefing)

    return briefing


@router.get("/applications/{id}/outlier-flags", response_model=List[ScoreOutlierFlagResponse])
def get_outlier_flags(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN", "EVALUATOR"))
):
    return db.query(ScoreOutlierFlag).options(
        joinedload(ScoreOutlierFlag.criteria),
        joinedload(ScoreOutlierFlag.evaluator),
        joinedload(ScoreOutlierFlag.reviewer)
    ).filter(ScoreOutlierFlag.application_id == id).all()


@router.patch("/outlier-flags/{id}", response_model=ScoreOutlierFlagResponse)
def review_outlier_flag(
    id: uuid.UUID,
    payload: OutlierFlagReviewRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    flag = db.query(ScoreOutlierFlag).filter(ScoreOutlierFlag.id == id).first()
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outlier flag not found.")

    flag.review_note = payload.review_note
    flag.reviewed_by = current_user.id
    db.commit()
    db.refresh(flag)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="outlier_flag.review",
        entity_type="score_outlier_flags",
        entity_id=id,
        after_state={"review_note": payload.review_note},
        ip_address=ip_addr
    )

    return flag


# -------------------------------------------------------------------
# 5. PANEL FINALIZATION & RANKINGS ENDPOINTS
# -------------------------------------------------------------------

@router.post("/panels/{id}/finalize", response_model=EvaluationPanelResponse)
def finalize_evaluation_panel(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    panel = db.query(EvaluationPanel).options(
        joinedload(EvaluationPanel.members)
    ).filter(EvaluationPanel.id == id).first()

    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Panel not found.")

    if panel.scoring_status == "finalized":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Panel is already finalized.")

    shortlisted_apps = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.startup)
    ).filter(
        ChallengeApplication.challenge_id == panel.challenge_id,
        ChallengeApplication.status == "shortlisted"
    ).all()

    criteria_list = db.query(EvaluationCriteria).filter(
        EvaluationCriteria.challenge_id == panel.challenge_id
    ).all()

    if not shortlisted_apps:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No shortlisted applications exist for this challenge.")

    if not criteria_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No evaluation criteria configured for this challenge.")

    # Guard: Verify ALL assigned evaluators have scored ALL shortlisted apps on ALL criteria
    missing_scores = []
    for app in shortlisted_apps:
        for evaluator in panel.members:
            for crit in criteria_list:
                score_obj = db.query(EvaluationScore).filter(
                    EvaluationScore.application_id == app.id,
                    EvaluationScore.evaluator_id == evaluator.id,
                    EvaluationScore.criteria_id == crit.id
                ).first()
                if not score_obj:
                    missing_scores.append(
                        f"Evaluator '{evaluator.full_name}' missing score for startup '{app.startup.name}' on criteria '{crit.name}'"
                    )

    if missing_scores:
        missing_summary = "; ".join(missing_scores[:3])
        if len(missing_scores) > 3:
            missing_summary += f" ... (+{len(missing_scores) - 3} more)"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot finalize panel: incomplete scoring. Missing {len(missing_scores)} score(s): [{missing_summary}]."
        )

    panel.scoring_status = "finalized"
    db.commit()
    db.refresh(panel)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="panel.finalize",
        entity_type="evaluation_panels",
        entity_id=id,
        after_state={"scoring_status": "finalized"},
        ip_address=ip_addr
    )

    return panel


@router.get("/challenges/{id}/rankings", response_model=List[ApplicationRankingItem])
def get_challenge_rankings(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN", "EVALUATOR"))
):
    panel = db.query(EvaluationPanel).filter(EvaluationPanel.challenge_id == id).first()
    if not panel or panel.scoring_status != "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rankings are only available after the evaluation panel is finalized."
        )

    shortlisted_apps = db.query(ChallengeApplication).options(
        joinedload(ChallengeApplication.startup)
    ).filter(
        ChallengeApplication.challenge_id == id,
        ChallengeApplication.status == "shortlisted"
    ).all()

    criteria_list = db.query(EvaluationCriteria).filter(
        EvaluationCriteria.challenge_id == id
    ).all()

    rankings = []
    for app in shortlisted_apps:
        weighted_score = 0.0
        for crit in criteria_list:
            scores = db.query(EvaluationScore).filter(
                EvaluationScore.application_id == app.id,
                EvaluationScore.criteria_id == crit.id
            ).all()
            if scores:
                avg_crit_score = sum([float(s.score) for s in scores]) / len(scores)
                weight_fraction = float(crit.weight) / 100.0
                weighted_score += avg_crit_score * weight_fraction

        rankings.append({
            "application_id": app.id,
            "startup_name": app.startup.name,
            "weighted_final_score": round(weighted_score, 2),
            "ai_match_score": float(app.ai_match_score) if app.ai_match_score is not None else None,
            "status": app.status
        })

    # Sort descending by weighted_final_score
    rankings.sort(key=lambda x: x["weighted_final_score"], reverse=True)

    # Assign rank 1..N
    results = []
    for rank_idx, item in enumerate(rankings, start=1):
        results.append(ApplicationRankingItem(
            rank=rank_idx,
            application_id=item["application_id"],
            startup_name=item["startup_name"],
            weighted_final_score=item["weighted_final_score"],
            ai_match_score=item["ai_match_score"],
            status=item["status"]
        ))

    return results
