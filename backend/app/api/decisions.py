import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    User, Department, Challenge, ChallengeApplication, Pilot, PilotMilestone, PilotKPI,
    EvaluationPanel, EvaluationScore, ProcurementDecision, StatusHistory
)
from app.schemas.schemas import (
    ProcurementDecisionCreate, ProcurementDecisionApprove, ProcurementDecisionSendBack,
    ProcurementDecisionResponse, DecisionBriefResponse, LifecycleSummaryResponse
)
from app.services.audit import log_audit
from app.services.gemini import generate_pilot_performance_summary

router = APIRouter(prefix="", tags=["procurement-decisions"])


def compute_kpi_progress(kpi: PilotKPI):
    if not kpi.measurements or kpi.baseline_value is None or kpi.target_value is None or kpi.target_value == kpi.baseline_value:
        return {
            "progress_percentage": None,
            "reason": "Target or baseline values not set by officer." if (kpi.baseline_value is None or kpi.target_value is None) else "No measurements recorded."
        }

    latest_meas = sorted(kpi.measurements, key=lambda m: m.measured_at, reverse=True)[0]
    latest = float(latest_meas.measured_value)
    base = float(kpi.baseline_value)
    target = float(kpi.target_value)

    if kpi.target_direction == "increase":
        prog = (latest - base) / (target - base) * 100
    else:
        prog = (base - latest) / (base - target) * 100

    prog = max(0.0, min(100.0, round(prog, 2)))
    return {"progress_percentage": prog, "reason": None}



def verify_officer_or_admin(user: User, department_id: uuid.UUID):
    user_roles = [r.name for r in user.roles]
    if "SUPER_ADMIN" in user_roles:
        return
    if "DEPARTMENT_OFFICER" in user_roles:
        if user.department_id != department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not belong to the department owning this challenge."
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Only Department Officers or Super Admins can access decision data."
    )


@router.get("/pilots/{id}/decision-brief", response_model=DecisionBriefResponse)
def get_pilot_decision_brief(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pilot = db.query(Pilot).filter(Pilot.id == id).first()
    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot not found.")

    if pilot.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Decision brief is only available when pilot status is 'completed'. Current status: '{pilot.status}'."
        )

    challenge = pilot.application.challenge
    verify_officer_or_admin(current_user, challenge.department_id)

    # 1. Challenge Details & Outcomes (Module 2)
    challenge_data = {
        "id": str(challenge.id),
        "title": challenge.title,
        "raw_problem_text": challenge.raw_problem_text,
        "structured_outcome_json": challenge.structured_outcome_json,
        "budget_ceiling": float(challenge.budget_ceiling) if challenge.budget_ceiling else None,
        "currency": challenge.currency
    }

    # 2. Evaluation Ranking & Weighted Score (Module 5)
    shortlisted_apps = db.query(ChallengeApplication).filter(
        ChallengeApplication.challenge_id == challenge.id,
        ChallengeApplication.status == "shortlisted"
    ).all()

    # Compute ranking among shortlisted candidates
    rankings = []
    for app in shortlisted_apps:
        scores = db.query(EvaluationScore).filter(EvaluationScore.application_id == app.id).all()
        weighted_score = 0.0
        if scores:
            scores_by_criteria = {}
            for s in scores:
                scores_by_criteria.setdefault(s.criteria_id, []).append(float(s.score))
            for crit_id, val_list in scores_by_criteria.items():
                avg_score = sum(val_list) / len(val_list)
                if scores[0].criteria:
                    crit_weight = float(s.criteria.weight) if hasattr(s, 'criteria') and s.criteria else 50.0
                else:
                    crit_weight = 50.0
                weighted_score += (avg_score * (crit_weight / 100.0))
        rankings.append({
            "application_id": str(app.id),
            "startup_name": app.startup.name if app.startup else "Unknown",
            "weighted_final_score": round(weighted_score, 2),
            "ai_match_score": app.ai_match_score
        })

    rankings.sort(key=lambda x: x["weighted_final_score"], reverse=True)
    rank = 1
    this_app_eval = {"application_id": str(pilot.application_id), "startup_name": pilot.application.startup.name, "weighted_final_score": 0.0, "rank": 1, "ai_match_score": pilot.application.ai_match_score}
    for idx, r in enumerate(rankings, start=1):
        if r["application_id"] == str(pilot.application_id):
            this_app_eval = {
                "application_id": r["application_id"],
                "startup_name": r["startup_name"],
                "weighted_final_score": r["weighted_final_score"],
                "rank": idx,
                "ai_match_score": r["ai_match_score"]
            }
            break

    # 3. KPI Progress & AI Performance Summary (Module 7)
    kpis = db.query(PilotKPI).filter(PilotKPI.pilot_id == pilot.id).all()
    kpi_list = []
    for k in kpis:
        prog_res = compute_kpi_progress(k)
        latest_val = k.measurements[-1].measured_value if k.measurements else None
        kpi_list.append({
            "id": str(k.id),
            "name": k.kpi_name,
            "unit": k.unit,
            "target_direction": k.target_direction,
            "baseline_value": float(k.baseline_value) if k.baseline_value is not None else None,
            "target_value": float(k.target_value) if k.target_value is not None else None,
            "latest_measured_value": float(latest_val) if latest_val is not None else None,
            "progress_percentage": prog_res.get("progress_percentage"),
            "reason": prog_res.get("reason")
        })

    if not pilot.performance_summary_cache:
        perf_summary_res = generate_pilot_performance_summary(
            challenge_title=challenge.title,
            startup_name=pilot.application.startup.name if (pilot.application and pilot.application.startup) else "Unknown",
            kpis_list=kpi_list
        )
        perf_summary = perf_summary_res.get("summary")
    else:
        perf_summary = pilot.performance_summary_cache.get("summary")


    kpi_progress_data = {
        "kpis": kpi_list,
        "performance_summary": perf_summary
    }

    # 4. Financial Breakdown & Milestones (Module 6)
    milestones = db.query(PilotMilestone).filter(PilotMilestone.pilot_id == pilot.id).all()
    total_budget = float(pilot.budget) if pilot.budget else 0.0
    total_paid = sum(float(m.payment_amount) for m in milestones if m.status == "paid")
    total_pending = sum(float(m.payment_amount) for m in milestones if m.status != "paid")
    milestone_summary = [
        {
            "id": str(m.id),
            "title": m.title,
            "due_date": str(m.due_date),
            "payment_amount": float(m.payment_amount),
            "status": m.status,
            "payment_reference": m.payment_reference
        }
        for m in milestones
    ]
    financial_breakdown_data = {
        "pilot_budget": total_budget,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "milestones": milestone_summary
    }

    return {
        "pilot_id": str(pilot.id),
        "pilot_status": pilot.status,
        "challenge": challenge_data,
        "application_evaluation": this_app_eval,
        "kpi_progress": kpi_progress_data,
        "financial_breakdown": financial_breakdown_data
    }


@router.post("/pilots/{id}/procurement-decision", response_model=ProcurementDecisionResponse, status_code=status.HTTP_201_CREATED)
def propose_procurement_decision(
    id: uuid.UUID,
    body: ProcurementDecisionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pilot = db.query(Pilot).filter(Pilot.id == id).first()
    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot not found.")

    if pilot.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Procurement decision can only be proposed for completed pilots. Current status: '{pilot.status}'."
        )

    challenge = pilot.application.challenge
    verify_officer_or_admin(current_user, challenge.department_id)

    # Validate decision type
    valid_decisions = ["scale_up", "reject", "extend_pilot", "terminate"]
    if body.decision not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{body.decision}'. Must be one of: {valid_decisions}"
        )

    if not body.justification or not body.justification.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="justification is required for procurement decision."
        )

    if body.decision == "scale_up":
        if body.contract_value is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="contract_value is required when decision is 'scale_up'."
            )
        if body.scale_up_details is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scale_up_details is required when decision is 'scale_up'."
            )

    if body.decision == "extend_pilot":
        if body.extended_end_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="extended_end_date is required when decision is 'extend_pilot'."
            )

    # Check existing proposed decision
    existing_proposed = db.query(ProcurementDecision).filter(
        ProcurementDecision.pilot_id == pilot.id,
        ProcurementDecision.status == "proposed"
    ).first()
    if existing_proposed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A procurement decision proposal is already pending approval for this pilot."
        )

    decision_obj = ProcurementDecision(
        id=uuid.uuid4(),
        pilot_id=pilot.id,
        decision=body.decision,
        proposed_by=current_user.id,
        proposed_at=datetime.utcnow(),
        justification=body.justification.strip(),
        contract_value=body.contract_value,
        scale_up_details=body.scale_up_details,
        extended_end_date=body.extended_end_date,
        status="proposed"
    )
    db.add(decision_obj)
    db.commit()
    db.refresh(decision_obj)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="procurement_decision.propose",
        entity_type="procurement_decisions",
        entity_id=decision_obj.id,
        after_state={"pilot_id": str(pilot.id), "decision": body.decision, "justification": body.justification},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return decision_obj


@router.post("/procurement-decisions/{id}/approve", response_model=ProcurementDecisionResponse)
def approve_procurement_decision(
    id: uuid.UUID,
    request: Request,
    body: Optional[ProcurementDecisionApprove] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Super Admins can approve procurement decisions."
        )

    dec = db.query(ProcurementDecision).filter(ProcurementDecision.id == id).first()
    if not dec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement decision not found.")

    if dec.status != "proposed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only decisions in 'proposed' status can be approved. Current status: '{dec.status}'."
        )

    # MAKER-CHECKER SECURITY GUARD FOR SCALE_UP
    if dec.decision == "scale_up" and dec.proposed_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scale-up approval must be performed by a different authorized user than the one who proposed it."
        )

    # Update decision status
    dec.status = "approved"
    dec.finalized_by = current_user.id
    dec.finalized_at = datetime.utcnow()
    if body and body.comments:
        dec.comments = body.comments
    db.flush()

    pilot = dec.pilot

    challenge = pilot.application.challenge

    if dec.decision in ["scale_up", "reject", "terminate"]:
        pilot.status = "completed"
        # Check if ALL pilots under this challenge have an approved procurement decision
        all_pilots = db.query(Pilot).join(ChallengeApplication).filter(
            ChallengeApplication.challenge_id == challenge.id
        ).all()

        all_pilots_decided = True
        for p in all_pilots:
            approved_dec = db.query(ProcurementDecision).filter(
                ProcurementDecision.pilot_id == p.id,
                ProcurementDecision.status == "approved"
            ).first()
            if not approved_dec:
                all_pilots_decided = False
                break

        if all_pilots_decided:
            old_chal_status = challenge.status
            challenge.status = "closed"
            chal_hist = StatusHistory(
                id=uuid.uuid4(),
                entity_type="challenge",
                entity_id=challenge.id,
                from_status=old_chal_status,
                to_status="closed",
                changed_by=current_user.id,
                changed_at=datetime.utcnow(),
                remarks=f"Challenge closed automatically following approved '{dec.decision}' decision on all associated pilots."
            )
            db.add(chal_hist)

    elif dec.decision == "extend_pilot":
        old_pilot_status = pilot.status
        pilot.status = "active"
        if dec.extended_end_date:
            pilot.end_date = dec.extended_end_date

        pilot_hist = StatusHistory(
            id=uuid.uuid4(),
            entity_type="pilot",
            entity_id=pilot.id,
            from_status=old_pilot_status,
            to_status="active",
            changed_by=current_user.id,
            changed_at=datetime.utcnow(),
            remarks=f"Pilot reactivated and extended to {dec.extended_end_date}."
        )
        db.add(pilot_hist)

    dec_hist = StatusHistory(
        id=uuid.uuid4(),
        entity_type="procurement_decision",
        entity_id=dec.id,
        from_status="proposed",
        to_status="approved",
        changed_by=current_user.id,
        changed_at=datetime.utcnow(),
        remarks=f"Procurement decision '{dec.decision}' approved."
    )
    db.add(dec_hist)

    db.commit()
    db.refresh(dec)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="procurement_decision.approve",
        entity_type="procurement_decisions",
        entity_id=dec.id,
        after_state={"decision": dec.decision, "status": "approved", "challenge_status": challenge.status},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return dec


@router.post("/procurement-decisions/{id}/send-back", response_model=ProcurementDecisionResponse)
def send_back_procurement_decision(
    id: uuid.UUID,
    body: ProcurementDecisionSendBack,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Super Admins can send back procurement decisions."
        )

    dec = db.query(ProcurementDecision).filter(ProcurementDecision.id == id).first()
    if not dec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement decision not found.")

    if dec.status != "proposed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only decisions in 'proposed' status can be sent back. Current status: '{dec.status}'."
        )

    if not body.comments or not body.comments.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="comments are required when sending back a procurement decision."
        )

    dec.status = "sent_back"
    dec.comments = body.comments.strip()
    dec.finalized_by = current_user.id
    dec.finalized_at = datetime.utcnow()

    dec_hist = StatusHistory(
        id=uuid.uuid4(),
        entity_type="procurement_decision",
        entity_id=dec.id,
        from_status="proposed",
        to_status="sent_back",
        changed_by=current_user.id,
        changed_at=datetime.utcnow(),
        remarks=f"Procurement decision sent back: {body.comments.strip()}"
    )
    db.add(dec_hist)

    db.commit()
    db.refresh(dec)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="procurement_decision.send_back",
        entity_type="procurement_decisions",
        entity_id=dec.id,
        after_state={"decision": dec.decision, "status": "sent_back", "comments": body.comments},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return dec


@router.get("/procurement-decisions", response_model=List[ProcurementDecisionResponse])
def list_procurement_decisions(
    decision: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ProcurementDecision).join(Pilot).join(ChallengeApplication).join(Challenge)

    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        if "DEPARTMENT_OFFICER" in user_roles:
            query = query.filter(Challenge.department_id == current_user.department_id)
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if decision:
        query = query.filter(ProcurementDecision.decision == decision)
    if status:
        query = query.filter(ProcurementDecision.status == status)

    decisions = query.order_by(ProcurementDecision.proposed_at.desc()).all()
    return decisions


@router.get("/challenges/{id}/lifecycle-summary", response_model=LifecycleSummaryResponse)
def get_challenge_lifecycle_summary(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(Challenge).filter(Challenge.id == id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    verify_officer_or_admin(current_user, challenge.department_id)

    # 1. Applications & Eligibility Breakdown
    applications = db.query(ChallengeApplication).filter(ChallengeApplication.challenge_id == challenge.id).all()
    total_apps = len(applications)
    shortlisted_apps = [a for a in applications if a.status == "shortlisted"]
    rejected_apps = [a for a in applications if a.status == "rejected"]

    eligibility_summary = {
        "total_applications": total_apps,
        "shortlisted_count": len(shortlisted_apps),
        "rejected_count": len(rejected_apps),
        "pending_count": total_apps - len(shortlisted_apps) - len(rejected_apps)
    }

    # 2. Evaluation Rankings
    rankings = []
    for app in shortlisted_apps:
        scores = db.query(EvaluationScore).filter(EvaluationScore.application_id == app.id).all()
        weighted_score = 0.0
        if scores:
            scores_by_criteria = {}
            for s in scores:
                scores_by_criteria.setdefault(s.criteria_id, []).append(float(s.score))
            for crit_id, val_list in scores_by_criteria.items():
                avg_score = sum(val_list) / len(val_list)
                crit_weight = float(s.criteria.weight) if hasattr(s, 'criteria') and s.criteria else 50.0
                weighted_score += (avg_score * (crit_weight / 100.0))
        rankings.append({
            "application_id": str(app.id),
            "startup_name": app.startup.name if app.startup else "Unknown",
            "weighted_final_score": round(weighted_score, 2),
            "ai_match_score": app.ai_match_score
        })
    rankings.sort(key=lambda x: x["weighted_final_score"], reverse=True)

    panel_exists = db.query(EvaluationPanel).filter(EvaluationPanel.challenge_id == challenge.id).first() is not None
    evaluation_summary = {
        "panel_configured": panel_exists,
        "rankings": rankings
    }

    # 3. Pilots & Individual Decisions
    pilots = db.query(Pilot).join(ChallengeApplication).filter(ChallengeApplication.challenge_id == challenge.id).all()
    pilots_summary = []
    for p in pilots:
        decisions_for_pilot = db.query(ProcurementDecision).filter(ProcurementDecision.pilot_id == p.id).order_by(ProcurementDecision.proposed_at.desc()).all()
        dec_list = [
            {
                "id": str(d.id),
                "decision": d.decision,
                "status": d.status,
                "justification": d.justification,
                "contract_value": float(d.contract_value) if d.contract_value is not None else None,
                "comments": d.comments,
                "proposed_by_email": d.proposer.email if d.proposer else None,
                "proposed_at": str(d.proposed_at)
            }
            for d in decisions_for_pilot
        ]

        milestones = db.query(PilotMilestone).filter(PilotMilestone.pilot_id == p.id).all()
        kpis = db.query(PilotKPI).filter(PilotKPI.pilot_id == p.id).all()

        pilots_summary.append({
            "pilot_id": str(p.id),
            "startup_name": p.application.startup.name if p.application and p.application.startup else "Unknown",
            "status": p.status,
            "budget": float(p.budget) if p.budget else None,
            "milestones_count": len(milestones),
            "milestones_paid_count": len([m for m in milestones if m.status == "paid"]),
            "kpis_count": len(kpis),
            "decisions": dec_list
        })

    return {
        "challenge_id": str(challenge.id),
        "title": challenge.title,
        "status": challenge.status,
        "department_name": challenge.department.name if challenge.department else None,
        "problem_statement": challenge.raw_problem_text,
        "structured_outcomes": challenge.structured_outcome_json,
        "eligibility_summary": eligibility_summary,
        "evaluation_summary": evaluation_summary,
        "pilots": pilots_summary
    }
