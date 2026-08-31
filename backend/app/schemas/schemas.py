import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field

class DepartmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role_names: List[str]
    department_id: Optional[uuid.UUID] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    department_id: Optional[uuid.UUID] = None
    department: Optional[DepartmentResponse] = None
    roles: List[RoleResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    actor_user_id: Optional[uuid.UUID] = None
    action: str
    entity_type: str
    entity_id: uuid.UUID
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    id: uuid.UUID
    owner_type: str
    owner_id: uuid.UUID
    doc_type: str
    file_url: str
    file_hash: str
    uploaded_by: uuid.UUID
    uploaded_at: datetime
    verification_status: str
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SectorResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class ChallengeEligibilityCriteriaCreate(BaseModel):
    criteria_key: str  # 'min_turnover', 'dpiit_required', 'sector_match', 'min_team_size'
    criteria_value_json: dict
    is_waivable: Optional[bool] = True
    waiver_reason_required: Optional[bool] = True


class ChallengeEligibilityCriteriaResponse(BaseModel):
    id: uuid.UUID
    challenge_id: uuid.UUID
    criteria_key: str
    criteria_value_json: dict
    is_waivable: bool
    waiver_reason_required: bool

    model_config = ConfigDict(from_attributes=True)


class ChallengeCreate(BaseModel):
    title: str
    raw_problem_text: str
    sector_id: uuid.UUID
    budget_ceiling: Optional[Decimal] = None
    currency: Optional[str] = "INR"
    timeline_start: Optional[date] = None
    timeline_end: Optional[date] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    raw_problem_text: Optional[str] = None
    sector_id: Optional[uuid.UUID] = None
    budget_ceiling: Optional[Decimal] = None
    currency: Optional[str] = None
    timeline_start: Optional[date] = None
    timeline_end: Optional[date] = None
    structured_outcome_json: Optional[dict] = None


class ApprovalStepResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    step_order: int
    approver_role_id: uuid.UUID
    approver_user_id: Optional[uuid.UUID] = None
    status: str
    decided_at: Optional[datetime] = None
    comments: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StatusHistoryResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    from_status: Optional[str] = None
    to_status: str
    changed_by: uuid.UUID
    changed_at: datetime
    remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ChallengeResponse(BaseModel):
    id: uuid.UUID
    department_id: uuid.UUID
    created_by: uuid.UUID
    title: str
    raw_problem_text: str
    structured_outcome_json: Optional[dict] = None
    ai_structuring_metadata: Optional[dict] = None
    sector_id: uuid.UUID
    budget_ceiling: Optional[Decimal] = None
    currency: str
    timeline_start: Optional[date] = None
    timeline_end: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime

    department: Optional[DepartmentResponse] = None
    sector: Optional[SectorResponse] = None
    criteria: List[ChallengeEligibilityCriteriaResponse] = []
    approval_steps: List[ApprovalStepResponse] = []
    status_history: List[StatusHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ApprovalDecision(BaseModel):
    comments: Optional[str] = None


class StartupRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    startup_name: str
    registration_number: str
    dpiit_recognition_number: Optional[str] = None
    sector_id: uuid.UUID
    description: str


class StartupUpdate(BaseModel):
    name: Optional[str] = None
    dpiit_recognition_number: Optional[str] = None
    sector_id: Optional[uuid.UUID] = None
    incorporation_date: Optional[date] = None
    description: Optional[str] = None
    website: Optional[str] = None
    team_size: Optional[int] = None
    funding_stage: Optional[str] = None


class StartupResponse(BaseModel):
    id: uuid.UUID
    name: str
    registration_number: str
    dpiit_recognition_number: Optional[str] = None
    sector_id: uuid.UUID
    incorporation_date: Optional[date] = None
    description: str
    website: Optional[str] = None
    team_size: Optional[int] = None
    funding_stage: Optional[str] = None
    contact_user_id: uuid.UUID
    profile_complete: bool
    created_at: datetime

    sector: Optional[SectorResponse] = None
    contact_user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SemanticMatchResponse(BaseModel):
    id: uuid.UUID
    title_or_name: str
    similarity_score: float
    sector_name: Optional[str] = None
    description_or_summary: Optional[str] = None
    item_type: str
    details: Optional[dict] = None


class EligibilityCheckResultResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    criteria_id: uuid.UUID
    rules_engine_passed: bool
    ai_verification_passed: Optional[bool] = None
    ai_verification_result: Optional[dict] = None
    final_passed: Optional[bool] = None
    waived: bool
    waiver_justification: Optional[str] = None
    checked_by: Optional[uuid.UUID] = None
    checked_at: datetime
    needs_human_review: bool = False

    criteria: Optional[ChallengeEligibilityCriteriaResponse] = None
    checker: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class EligibilityOverrideRequest(BaseModel):
    final_passed: Optional[bool] = None
    waived: Optional[bool] = False
    waiver_justification: Optional[str] = None


class ChallengeApplicationResponse(BaseModel):
    id: uuid.UUID
    challenge_id: uuid.UUID
    startup_id: uuid.UUID
    submitted_at: datetime
    status: str
    ai_match_score: Optional[float] = None
    ai_match_explanation: Optional[str] = None

    challenge: Optional[ChallengeResponse] = None
    startup: Optional[StartupResponse] = None
    eligibility_results: List[EligibilityCheckResultResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ApplicationRejectRequest(BaseModel):
    reason: str


# --- Module 5 Schemas ---

class EvaluationCriteriaCreate(BaseModel):
    name: str
    weight: Decimal
    max_score: Decimal


class EvaluationCriteriaResponse(BaseModel):
    id: uuid.UUID
    challenge_id: uuid.UUID
    name: str
    weight: Decimal
    max_score: Decimal

    model_config = ConfigDict(from_attributes=True)


class EvaluationPanelCreate(BaseModel):
    challenge_id: uuid.UUID
    name: str
    evaluator_user_ids: List[uuid.UUID]


class EvaluationPanelResponse(BaseModel):
    id: uuid.UUID
    challenge_id: uuid.UUID
    name: str
    scoring_status: str
    members: List[UserResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SingleScoreInput(BaseModel):
    criteria_id: uuid.UUID
    score: float
    comments: Optional[str] = None


class SubmitScoresRequest(BaseModel):
    scores: List[SingleScoreInput]


class EvaluationScoreResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    evaluator_id: uuid.UUID
    criteria_id: uuid.UUID
    score: float
    comments: Optional[str] = None
    submitted_at: datetime
    prev_hash: str
    row_hash: str

    evaluator: Optional[UserResponse] = None
    criteria: Optional[EvaluationCriteriaResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ScoreChainVerificationResponse(BaseModel):
    valid: bool
    content_tampered_rows: List[dict] = []
    chain_broken_at: Optional[str] = None
    total_scores: int
    reason: str


class ScoreOutlierFlagResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    criteria_id: uuid.UUID
    evaluator_id: uuid.UUID
    evaluator_score: float
    panel_average: float
    deviation: float
    flagged_at: datetime
    reviewed_by: Optional[uuid.UUID] = None
    review_note: Optional[str] = None

    criteria: Optional[EvaluationCriteriaResponse] = None
    evaluator: Optional[UserResponse] = None
    reviewer: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class OutlierFlagReviewRequest(BaseModel):
    review_note: str


class EvaluatorBriefingResponse(BaseModel):
    application_id: uuid.UUID
    evaluator_id: uuid.UUID
    briefing_text: str
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationRankingItem(BaseModel):
    rank: int
    application_id: uuid.UUID
    startup_name: str
    weighted_final_score: float
    ai_match_score: Optional[float] = None
    status: str


# --- Module 6 Schemas ---

class PilotUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    ip_ownership_terms: Optional[str] = None
    data_ownership_terms: Optional[str] = None
    contract_document_id: Optional[uuid.UUID] = None


class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: date
    payment_amount: Decimal


class MilestonePaymentInitiate(BaseModel):
    payment_reference: str


class MilestonePaymentConfirm(BaseModel):
    payment_proof_document_id: Optional[uuid.UUID] = None


class PilotMilestoneResponse(BaseModel):
    id: uuid.UUID
    pilot_id: uuid.UUID
    title: str
    description: Optional[str] = None
    due_date: date
    payment_amount: Decimal
    status: str
    evidence_document_id: Optional[uuid.UUID] = None
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    payment_reference: Optional[str] = None
    payment_proof_document_id: Optional[uuid.UUID] = None
    payment_initiated_by: Optional[uuid.UUID] = None
    payment_initiated_at: Optional[datetime] = None
    payment_confirmed_by: Optional[uuid.UUID] = None
    payment_confirmed_at: Optional[datetime] = None

    evidence_document: Optional[DocumentResponse] = None
    payment_proof_document: Optional[DocumentResponse] = None
    approver: Optional[UserResponse] = None
    initiator: Optional[UserResponse] = None
    confirmer: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class PilotResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    status: str
    contract_status: str
    ip_ownership_terms: Optional[str] = None
    data_ownership_terms: Optional[str] = None
    contract_ai_draft: Optional[dict] = None
    contract_document_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    performance_summary_cache: Optional[dict] = None

    ai_terms_diff: Optional[dict] = None

    application: Optional[ChallengeApplicationResponse] = None
    contract_document: Optional[DocumentResponse] = None
    milestones: List[PilotMilestoneResponse] = []
    kpis: List["PilotKPIResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class PilotKPICreate(BaseModel):
    kpi_name: str
    description: Optional[str] = None
    unit: str
    target_direction: str  # 'increase' or 'decrease'
    target_value: Optional[Decimal] = None
    baseline_value: Optional[Decimal] = None
    measurement_frequency: Optional[str] = "monthly"


class PilotKPIUpdate(BaseModel):
    description: Optional[str] = None
    target_value: Optional[Decimal] = None
    baseline_value: Optional[Decimal] = None
    measurement_frequency: Optional[str] = None


class KPIMeasurementCreate(BaseModel):
    measured_value: Decimal
    evidence_document_id: Optional[uuid.UUID] = None
    remarks: Optional[str] = None


class PilotKPIMeasurementResponse(BaseModel):
    id: uuid.UUID
    kpi_id: uuid.UUID
    measured_value: Decimal
    measured_at: datetime
    measured_by: uuid.UUID
    evidence_document_id: Optional[uuid.UUID] = None
    remarks: Optional[str] = None
    evidence_document: Optional[DocumentResponse] = None
    measured_by_user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class PilotKPIResponse(BaseModel):
    id: uuid.UUID
    pilot_id: uuid.UUID
    kpi_name: str
    description: Optional[str] = None
    unit: str
    target_direction: str
    target_value: Optional[Decimal] = None
    baseline_value: Optional[Decimal] = None
    measurement_frequency: str
    source: str
    created_at: datetime
    progress_percentage: Optional[float] = None
    reason: Optional[str] = None
    measurements: List[PilotKPIMeasurementResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ChallengeKPISummaryResponse(BaseModel):
    challenge_id: uuid.UUID
    overall_average_progress: Optional[float] = None
    pilot_summaries: List[dict] = []

    model_config = ConfigDict(from_attributes=True)


class PerformanceSummaryResponse(BaseModel):
    pilot_id: uuid.UUID
    summary: str
    generated_at: datetime
    ai_generated: bool

    model_config = ConfigDict(from_attributes=True)


# --- Module 8 Schemas ---

class ProcurementDecisionCreate(BaseModel):
    decision: str  # 'scale_up', 'reject', 'extend_pilot', 'terminate'
    justification: str
    contract_value: Optional[Decimal] = None
    scale_up_details: Optional[dict] = None
    extended_end_date: Optional[date] = None


class ProcurementDecisionApprove(BaseModel):
    comments: Optional[str] = None


class ProcurementDecisionSendBack(BaseModel):
    comments: str


class ProcurementDecisionResponse(BaseModel):
    id: uuid.UUID
    pilot_id: uuid.UUID
    decision: str
    proposed_by: uuid.UUID
    proposed_at: datetime
    justification: str
    contract_value: Optional[Decimal] = None
    scale_up_details: Optional[dict] = None
    extended_end_date: Optional[date] = None
    status: str
    comments: Optional[str] = None
    finalized_by: Optional[uuid.UUID] = None
    finalized_at: Optional[datetime] = None

    proposer: Optional[UserResponse] = None
    finalizer: Optional[UserResponse] = None
    pilot: Optional[PilotResponse] = None

    model_config = ConfigDict(from_attributes=True)


class DecisionBriefResponse(BaseModel):
    pilot_id: uuid.UUID
    pilot_status: str
    challenge: dict
    application_evaluation: dict
    kpi_progress: dict
    financial_breakdown: dict


class LifecycleSummaryResponse(BaseModel):
    challenge_id: uuid.UUID
    title: str
    status: str
    department_name: Optional[str] = None
    problem_statement: str
    structured_outcomes: Optional[dict] = None
    eligibility_summary: dict
    evaluation_summary: dict
    pilots: List[dict] = []

