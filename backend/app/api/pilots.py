import uuid
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import (
    User,
    Role,
    Challenge,
    ChallengeApplication,
    EvaluationPanel,
    Document,
    StatusHistory,
    Pilot,
    PilotMilestone,
    Startup,
    PilotKPI,
    PilotKPIMeasurement
)
from app.schemas.schemas import (
    PilotUpdate,
    MilestoneCreate,
    MilestonePaymentInitiate,
    MilestonePaymentConfirm,
    PilotMilestoneResponse,
    PilotResponse,
    PilotKPICreate,
    PilotKPIUpdate,
    KPIMeasurementCreate,
    PilotKPIResponse,
    PilotKPIMeasurementResponse,
    ChallengeKPISummaryResponse,
    PerformanceSummaryResponse
)
from app.core.security import require_role, get_current_user
from app.services.audit import log_audit
from app.services.gemini import draft_pilot_contract, generate_pilot_performance_summary

router = APIRouter(prefix="", tags=["module6-pilots"])


# -------------------------------------------------------------------
# 1. PILOT INITIATION & SELECTION
# -------------------------------------------------------------------

@router.post("/applications/{id}/select-for-pilot", response_model=PilotResponse)
def select_application_for_pilot(
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

    # Guard 1: Application must be shortlisted
    if app_obj.status != "shortlisted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Applications must be shortlisted prior to pilot selection."
        )

    # Guard 2: Challenge evaluation panel must be finalized
    panel = db.query(EvaluationPanel).filter(EvaluationPanel.challenge_id == app_obj.challenge_id).first()
    if not panel or panel.scoring_status != "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge evaluation panel must be finalized before selecting applications for pilot."
        )

    # Check if pilot already initialized
    existing_pilot = db.query(Pilot).filter(Pilot.application_id == id).first()
    if existing_pilot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pilot project has already been initialized for this application."
        )

    # Create Pilot
    pilot = Pilot(
        id=uuid.uuid4(),
        application_id=id,
        status="not_started",
        contract_status="draft"
    )
    db.add(pilot)

    from_status = app_obj.status
    app_obj.status = "selected"

    history = StatusHistory(
        entity_type="challenge_applications",
        entity_id=id,
        from_status=from_status,
        to_status="selected",
        changed_by=current_user.id,
        remarks="Selected for pilot deployment following panel finalization."
    )
    db.add(history)
    db.commit()
    db.refresh(pilot)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot.create",
        entity_type="pilots",
        entity_id=pilot.id,
        after_state={"status": pilot.status, "contract_status": pilot.contract_status},
        ip_address=ip_addr
    )

    return pilot


# -------------------------------------------------------------------
# 2. AI CONTRACT DRAFTING & CONTRACT EDITING
# -------------------------------------------------------------------

@router.post("/pilots/{id}/draft-contract", response_model=PilotResponse)
def draft_contract_with_ai(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    pilot = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge),
        joinedload(Pilot.application).joinedload(ChallengeApplication.startup)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    if pilot.contract_status != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI contract drafting only allowed while contract status is 'draft'.")

    chal = pilot.application.challenge
    startup = pilot.application.startup

    ai_draft_res = draft_pilot_contract(
        challenge_title=chal.title,
        challenge_outcomes_json=chal.structured_outcome_json,
        startup_name=startup.name,
        startup_description=startup.description
    )

    pilot.contract_ai_draft = ai_draft_res
    pilot.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pilot)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot.ai_draft_contract",
        entity_type="pilots",
        entity_id=id,
        after_state={"ai_draft": ai_draft_res},
        ip_address=ip_addr
    )

    return pilot


@router.patch("/pilots/{id}", response_model=PilotResponse)
def update_pilot_terms(
    id: uuid.UUID,
    payload: PilotUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    pilot = db.query(Pilot).filter(Pilot.id == id).first()
    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    if pilot.contract_status == "finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Contract terms are finalized and locked. Modifications are prohibited."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(pilot, k, v)

    pilot.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pilot)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot.update",
        entity_type="pilots",
        entity_id=id,
        after_state=update_data,
        ip_address=ip_addr
    )

    return pilot


@router.post("/pilots/{id}/milestones", response_model=PilotMilestoneResponse)
def create_pilot_milestone(
    id: uuid.UUID,
    payload: MilestoneCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    pilot = db.query(Pilot).filter(Pilot.id == id).first()
    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    milestone = PilotMilestone(
        id=uuid.uuid4(),
        pilot_id=id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        payment_amount=payload.payment_amount,
        status="pending"
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_milestones.create",
        entity_type="pilot_milestones",
        entity_id=milestone.id,
        after_state={"title": milestone.title, "payment_amount": float(milestone.payment_amount)},
        ip_address=ip_addr
    )

    return milestone


@router.post("/pilots/{id}/finalize-contract", response_model=PilotResponse)
def finalize_pilot_contract(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    pilot = db.query(Pilot).options(
        joinedload(Pilot.milestones)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    if pilot.contract_status == "finalized":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract is already finalized.")

    # Guard 1: Signed contract document required
    if not pilot.contract_document_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract document must be uploaded and linked before finalization."
        )

    # Guard 2: Terms non-empty
    if not (pilot.ip_ownership_terms and pilot.ip_ownership_terms.strip()) or not (pilot.data_ownership_terms and pilot.data_ownership_terms.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IP ownership and data ownership terms must be configured."
        )

    # Guard 3: At least one milestone must exist
    if not pilot.milestones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one pilot milestone must be configured before finalizing contract."
        )

    # Compute AI vs Human Terms Diff
    ai_draft = pilot.contract_ai_draft or {}
    ai_ip = ai_draft.get("ip_ownership_terms", "N/A")
    ai_data = ai_draft.get("data_ownership_terms", "N/A")

    diff_data = {
        "ai_proposed": {
            "ip_ownership_terms": ai_ip,
            "data_ownership_terms": ai_data
        },
        "final_approved": {
            "ip_ownership_terms": pilot.ip_ownership_terms,
            "data_ownership_terms": pilot.data_ownership_terms
        }
    }

    pilot.contract_status = "finalized"
    pilot.status = "active"
    pilot.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(pilot)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot.finalize_contract",
        entity_type="pilots",
        entity_id=id,
        before_state={"ai_proposed": diff_data["ai_proposed"]},
        after_state={"final_approved": diff_data["final_approved"]},
        ip_address=ip_addr
    )

    return pilot


# -------------------------------------------------------------------
# 3. MILESTONE EVIDENCE, APPROVAL & MAKER-CHECKER PAYMENTS
# -------------------------------------------------------------------

@router.post("/milestones/{id}/submit-evidence", response_model=PilotMilestoneResponse)
def submit_milestone_evidence(
    id: uuid.UUID,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STARTUP_USER"))
):
    ip_addr = request.client.host if request.client else None

    milestone = db.query(PilotMilestone).options(
        joinedload(PilotMilestone.pilot).joinedload(Pilot.application).joinedload(ChallengeApplication.startup)
    ).filter(PilotMilestone.id == id).first()

    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

    startup = milestone.pilot.application.startup
    if startup.contact_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You can only submit evidence for your own startup's pilot.")

    doc_id = payload.get("evidence_document_id")
    if not doc_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="evidence_document_id is required.")

    milestone.evidence_document_id = uuid.UUID(str(doc_id))
    milestone.status = "submitted"
    db.commit()
    db.refresh(milestone)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_milestones.submit_evidence",
        entity_type="pilot_milestones",
        entity_id=id,
        after_state={"evidence_document_id": str(doc_id), "status": "submitted"},
        ip_address=ip_addr
    )

    return milestone


@router.post("/milestones/{id}/approve", response_model=PilotMilestoneResponse)
def approve_milestone(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    milestone = db.query(PilotMilestone).filter(PilotMilestone.id == id).first()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

    if not milestone.evidence_document_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Milestone evidence document must be submitted prior to approval."
        )

    milestone.status = "approved"
    milestone.approved_by = current_user.id
    milestone.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(milestone)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_milestones.approve",
        entity_type="pilot_milestones",
        entity_id=id,
        after_state={"status": "approved", "approved_by": str(current_user.id)},
        ip_address=ip_addr
    )

    return milestone


@router.post("/milestones/{id}/initiate-payment", response_model=PilotMilestoneResponse)
def initiate_milestone_payment(
    id: uuid.UUID,
    payload: MilestonePaymentInitiate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("PROCUREMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    milestone = db.query(PilotMilestone).filter(PilotMilestone.id == id).first()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

    if milestone.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment can only be initiated for approved milestones."
        )

    milestone.payment_reference = payload.payment_reference
    milestone.payment_initiated_by = current_user.id
    milestone.payment_initiated_at = datetime.utcnow()
    milestone.status = "payment_initiated"
    db.commit()
    db.refresh(milestone)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_milestones.initiate_payment",
        entity_type="pilot_milestones",
        entity_id=id,
        after_state={"payment_reference": payload.payment_reference, "status": "payment_initiated"},
        ip_address=ip_addr
    )

    return milestone


@router.post("/milestones/{id}/confirm-payment", response_model=PilotMilestoneResponse)
def confirm_milestone_payment(
    id: uuid.UUID,
    payload: MilestonePaymentConfirm,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("PROCUREMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    milestone = db.query(PilotMilestone).filter(PilotMilestone.id == id).first()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

    if milestone.status != "payment_initiated":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment confirmation requires status 'payment_initiated'."
        )

    # MAKER-CHECKER RULE: Confirming user MUST be different from Initiating user!
    if milestone.payment_initiated_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment confirmation must be performed by a different authorized user than the one who initiated it."
        )

    proof_doc = payload.payment_proof_document_id or milestone.payment_proof_document_id
    if not proof_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment proof document required for payment confirmation."
        )

    milestone.payment_proof_document_id = proof_doc
    milestone.payment_confirmed_by = current_user.id
    milestone.payment_confirmed_at = datetime.utcnow()
    milestone.status = "paid"
    db.commit()
    db.refresh(milestone)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_milestones.confirm_payment",
        entity_type="pilot_milestones",
        entity_id=id,
        after_state={"status": "paid", "confirmed_by": str(current_user.id)},
        ip_address=ip_addr
    )

    return milestone


# -------------------------------------------------------------------
# 4. QUERY ENDPOINTS
# -------------------------------------------------------------------

@router.get("/pilots/{id}", response_model=PilotResponse)
def get_pilot_by_id(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pilot = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge),
        joinedload(Pilot.application).joinedload(ChallengeApplication.startup),
        joinedload(Pilot.contract_document),
        joinedload(Pilot.milestones).joinedload(PilotMilestone.evidence_document),
        joinedload(Pilot.milestones).joinedload(PilotMilestone.payment_proof_document),
        joinedload(Pilot.milestones).joinedload(PilotMilestone.approver),
        joinedload(Pilot.milestones).joinedload(PilotMilestone.initiator),
        joinedload(Pilot.milestones).joinedload(PilotMilestone.confirmer)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    res = PilotResponse.model_validate(pilot)

    # Populate AI terms diff for SUPER_ADMIN
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" in user_roles:
        ai_draft = pilot.contract_ai_draft or {}
        res.ai_terms_diff = {
            "ai_proposed": {
                "ip_terms": ai_draft.get("ip_ownership_terms", "N/A"),
                "data_terms": ai_draft.get("data_ownership_terms", "N/A")
            },
            "final_approved": {
                "ip_terms": pilot.ip_ownership_terms or "N/A",
                "data_terms": pilot.data_ownership_terms or "N/A"
            }
        }

    return res


@router.get("/startups/me/pilots", response_model=List[PilotResponse])
def get_my_pilots(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STARTUP_USER"))
):
    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        return []

    pilots = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge),
        joinedload(Pilot.milestones)
    ).join(ChallengeApplication, Pilot.application_id == ChallengeApplication.id).filter(
        ChallengeApplication.startup_id == startup.id
    ).all()

    return pilots


@router.get("/pilots", response_model=List[PilotResponse])
def get_all_pilots(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    user_roles = [r.name for r in current_user.roles]
    query = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge),
        joinedload(Pilot.application).joinedload(ChallengeApplication.startup),
        joinedload(Pilot.milestones)
    ).join(ChallengeApplication, Pilot.application_id == ChallengeApplication.id).join(Challenge, ChallengeApplication.challenge_id == Challenge.id)

    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        query = query.filter(Challenge.department_id == current_user.department_id)

    return query.all()


@router.get("/challenges/{id}/pilots", response_model=List[PilotResponse])
def get_challenge_pilots(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    pilots = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.startup),
        joinedload(Pilot.milestones)
    ).join(ChallengeApplication, Pilot.application_id == ChallengeApplication.id).filter(
        ChallengeApplication.challenge_id == id
    ).all()

    return pilots


# ===================================================================
# MODULE 7: KPI MEASUREMENT ENDPOINTS
# ===================================================================

@router.post("/pilots/{id}/kpis/suggest")
def suggest_pilot_kpis(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None
    pilot = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    # Enforce department isolation
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if pilot.application.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    chal = pilot.application.challenge
    suggested_list = []
    if chal.structured_outcome_json and isinstance(chal.structured_outcome_json, dict):
        suggested_list = chal.structured_outcome_json.get("suggested_kpis", [])

    created_kpis = []
    if not suggested_list:
        return {
            "message": "No AI-suggested KPIs found in challenge outcomes.",
            "kpis": []
        }

    for item in suggested_list:
        # Check if already added
        existing = db.query(PilotKPI).filter(
            PilotKPI.pilot_id == id,
            PilotKPI.kpi_name == item.get("name")
        ).first()
        if existing:
            continue

        kpi = PilotKPI(
            id=uuid.uuid4(),
            pilot_id=id,
            kpi_name=item.get("name", "Unnamed KPI"),
            description=item.get("description"),
            unit=item.get("unit", "units"),
            target_direction=item.get("target_direction", "increase"),
            source="ai_suggested",
            target_value=None,
            baseline_value=None
        )
        db.add(kpi)
        created_kpis.append(kpi)

    db.commit()

    for k in created_kpis:
        db.refresh(k)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_kpis.suggest",
        entity_type="pilots",
        entity_id=id,
        after_state={"created_count": len(created_kpis)},
        ip_address=ip_addr
    )

    return {
        "message": f"Successfully loaded {len(created_kpis)} AI-suggested KPIs.",
        "kpis": [PilotKPIResponse.model_validate(k) for k in created_kpis]
    }


@router.post("/pilots/{id}/kpis", response_model=PilotKPIResponse)
def create_manual_kpi(
    id: uuid.UUID,
    payload: PilotKPICreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None
    pilot = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    # Enforce department isolation
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if pilot.application.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    kpi = PilotKPI(
        id=uuid.uuid4(),
        pilot_id=id,
        kpi_name=payload.kpi_name,
        description=payload.description,
        unit=payload.unit,
        target_direction=payload.target_direction,
        target_value=payload.target_value,
        baseline_value=payload.baseline_value,
        measurement_frequency=payload.measurement_frequency or "monthly",
        source="manual"
    )
    db.add(kpi)
    db.commit()
    db.refresh(kpi)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_kpis.create",
        entity_type="pilot_kpis",
        entity_id=kpi.id,
        after_state={"kpi_name": kpi.kpi_name, "source": kpi.source},
        ip_address=ip_addr
    )

    return kpi


@router.patch("/pilot_kpis/{id}", response_model=PilotKPIResponse)
def update_pilot_kpi(
    id: uuid.UUID,
    payload: PilotKPIUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None
    kpi = db.query(PilotKPI).options(
        joinedload(PilotKPI.pilot).joinedload(Pilot.application).joinedload(ChallengeApplication.challenge)
    ).filter(PilotKPI.id == id).first()

    if not kpi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI not found.")

    # Enforce department isolation
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if kpi.pilot.application.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Edit allowed anytime pilot.status='active'
    if kpi.pilot.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KPI modifications are only allowed when the pilot status is active."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(kpi, k, v)

    db.commit()
    db.refresh(kpi)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_kpis.update",
        entity_type="pilot_kpis",
        entity_id=id,
        after_state=update_data,
        ip_address=ip_addr
    )

    return kpi


@router.post("/pilot_kpis/{id}/measurements", response_model=PilotKPIMeasurementResponse)
def record_kpi_measurement(
    id: uuid.UUID,
    payload: KPIMeasurementCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STARTUP_USER", "DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None
    kpi = db.query(PilotKPI).options(
        joinedload(PilotKPI.pilot).joinedload(Pilot.application).joinedload(ChallengeApplication.startup),
        joinedload(PilotKPI.pilot).joinedload(Pilot.application).joinedload(ChallengeApplication.challenge)
    ).filter(PilotKPI.id == id).first()

    if not kpi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI not found.")

    user_roles = [r.name for r in current_user.roles]

    # Enforce access separation
    if "SUPER_ADMIN" not in user_roles:
        if "STARTUP_USER" in user_roles:
            startup = kpi.pilot.application.startup
            if startup.contact_user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Startups can only record measurements for their own pilot.")
        elif "DEPARTMENT_OFFICER" in user_roles:
            if kpi.pilot.application.challenge.department_id != current_user.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    meas = PilotKPIMeasurement(
        id=uuid.uuid4(),
        kpi_id=id,
        measured_value=payload.measured_value,
        measured_at=datetime.utcnow(),
        measured_by=current_user.id,
        evidence_document_id=payload.evidence_document_id,
        remarks=payload.remarks
    )
    db.add(meas)
    db.commit()
    db.refresh(meas)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot_kpi_measurements.create",
        entity_type="pilot_kpi_measurements",
        entity_id=meas.id,
        after_state={"measured_value": float(meas.measured_value)},
        ip_address=ip_addr
    )

    return meas


@router.get("/pilot_kpis/{id}/measurements", response_model=List[PilotKPIMeasurementResponse])
def get_kpi_measurements(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meas = db.query(PilotKPIMeasurement).options(
        joinedload(PilotKPIMeasurement.evidence_document),
        joinedload(PilotKPIMeasurement.measured_by_user)
    ).filter(PilotKPIMeasurement.kpi_id == id).order_by(PilotKPIMeasurement.measured_at.asc()).all()

    return meas


@router.get("/pilots/{id}/kpis", response_model=List[PilotKPIResponse])
def get_pilot_kpis(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    kpis = db.query(PilotKPI).options(
        joinedload(PilotKPI.measurements).joinedload(PilotKPIMeasurement.evidence_document),
        joinedload(PilotKPI.measurements).joinedload(PilotKPIMeasurement.measured_by_user)
    ).filter(PilotKPI.pilot_id == id).all()

    response_list = []
    for k in kpis:
        res = PilotKPIResponse.model_validate(k)
        
        # Compute progress percentage programmatically
        latest_meas = None
        if k.measurements:
            sorted_meas = sorted(k.measurements, key=lambda m: m.measured_at, reverse=True)
            latest_meas = sorted_meas[0]

        if k.baseline_value is None or k.target_value is None:
            res.progress_percentage = None
            res.reason = "Target or baseline values not set by officer."
        elif latest_meas is None:
            res.progress_percentage = None
            res.reason = "No measurements recorded yet."
        elif k.target_value == k.baseline_value:
            res.progress_percentage = None
            res.reason = "Baseline and target values cannot be equal."
        else:
            latest = latest_meas.measured_value
            base = k.baseline_value
            target = k.target_value

            if k.target_direction == "increase":
                progress = (latest - base) / (target - base) * 100
            else:
                progress = (base - latest) / (base - target) * 100

            # Clamp between 0 and 100
            progress_clamped = max(0.0, min(100.0, float(progress)))
            res.progress_percentage = round(progress_clamped, 2)
            res.reason = None

        response_list.append(res)

    return response_list


@router.get("/challenges/{id}/kpi-summary", response_model=ChallengeKPISummaryResponse)
def get_challenge_kpi_summary(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    pilots = db.query(Pilot).join(ChallengeApplication).filter(ChallengeApplication.challenge_id == id).all()
    
    pilot_summaries = []
    all_progresses = []

    for p in pilots:
        # Re-use the programmatic logic to get progress per KPI
        kpi_list = db.query(PilotKPI).options(joinedload(PilotKPI.measurements)).filter(PilotKPI.pilot_id == p.id).all()
        kpi_res = []
        pilot_sum = 0
        valid_kpis = 0

        for k in kpi_list:
            latest_meas = sorted(k.measurements, key=lambda m: m.measured_at, reverse=True)[0] if k.measurements else None
            
            progress_pct = None
            if k.baseline_value is not None and k.target_value is not None and latest_meas is not None and k.target_value != k.baseline_value:
                latest = latest_meas.measured_value
                base = k.baseline_value
                target = k.target_value

                if k.target_direction == "increase":
                    progress = (latest - base) / (target - base) * 100
                else:
                    progress = (base - latest) / (base - target) * 100

                progress_pct = max(0.0, min(100.0, float(progress)))
                pilot_sum += progress_pct
                valid_kpis += 1
                all_progresses.append(progress_pct)

            kpi_res.append({
                "kpi_name": k.kpi_name,
                "progress_percentage": progress_pct
            })

        pilot_summaries.append({
            "pilot_id": p.id,
            "startup_name": p.application.startup.name,
            "average_progress": (pilot_sum / valid_kpis) if valid_kpis > 0 else None,
            "kpis": kpi_res
        })

    overall_avg = (sum(all_progresses) / len(all_progresses)) if all_progresses else None

    return ChallengeKPISummaryResponse(
        challenge_id=id,
        overall_average_progress=overall_avg,
        pilot_summaries=pilot_summaries
    )


@router.get("/pilots/{id}/performance-summary", response_model=PerformanceSummaryResponse)
def get_pilot_performance_summary(
    id: uuid.UUID,
    refresh: Optional[bool] = Query(False, description="Explicit refresh to regenerate AI summary"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    pilot = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge),
        joinedload(Pilot.application).joinedload(ChallengeApplication.startup)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    # Enforce department isolation
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if pilot.application.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Return cached unless refresh is true or cache is missing
    cache = pilot.performance_summary_cache or {}
    if not refresh and cache.get("summary"):
        return PerformanceSummaryResponse(
            pilot_id=id,
            summary=cache.get("summary"),
            generated_at=datetime.fromisoformat(cache.get("generated_at")),
            ai_generated=cache.get("ai_generated", True)
        )

    # Gather KPI Details for prompt
    kpis = db.query(PilotKPI).options(joinedload(PilotKPI.measurements)).filter(PilotKPI.pilot_id == id).all()
    kpi_payload = []
    for k in kpis:
        history = [{"measured_value": float(m.measured_value), "measured_at": m.measured_at.isoformat()} for m in k.measurements]
        kpi_payload.append({
            "kpi_name": k.kpi_name,
            "unit": k.unit,
            "target_direction": k.target_direction,
            "target_value": float(k.target_value) if k.target_value is not None else None,
            "baseline_value": float(k.baseline_value) if k.baseline_value is not None else None,
            "measurement_history": history
        })

    ai_res = generate_pilot_performance_summary(
        challenge_title=pilot.application.challenge.title,
        startup_name=pilot.application.startup.name,
        kpis_list=kpi_payload
    )

    # Save to Cache
    gen_time = datetime.utcnow()
    pilot.performance_summary_cache = {
        "summary": ai_res["summary"],
        "generated_at": gen_time.isoformat(),
        "ai_generated": ai_res["ai_generated"]
    }
    db.commit()

    return PerformanceSummaryResponse(
        pilot_id=id,
        summary=ai_res["summary"],
        generated_at=gen_time,
        ai_generated=ai_res["ai_generated"]
    )


@router.post("/pilots/{id}/complete", response_model=PilotResponse)
def complete_pilot_project(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None
    pilot = db.query(Pilot).options(
        joinedload(Pilot.application).joinedload(ChallengeApplication.challenge)
    ).filter(Pilot.id == id).first()

    if not pilot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot project not found.")

    # Enforce department isolation
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "DEPARTMENT_OFFICER" in user_roles:
        if pilot.application.challenge.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Allowed only when status is 'active'
    if pilot.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active pilot projects can be transitioned to completed status."
        )

    pilot.status = "completed"
    pilot.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pilot)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="pilot.complete",
        entity_type="pilots",
        entity_id=id,
        after_state={"status": "completed"},
        ip_address=ip_addr
    )

    return pilot
