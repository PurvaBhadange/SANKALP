import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Table, Column, ForeignKey, String, Text, Boolean, Integer, DateTime, Numeric, Date, text, JSON, func, TypeDecorator, CHAR

from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB, INET as PG_INET
from sqlalchemy.orm import Mapped, mapped_column, relationship
try:
    from pgvector.sqlalchemy import Vector as PG_Vector
except ImportError:
    PG_Vector = None

from app.models.base import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses String(36).
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))


    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(str(value))
            return value


def get_uuid_type():
    return GUID()

def get_json_type():
    return PG_JSONB().with_variant(JSON(), "sqlite")

def get_inet_type():
    return PG_INET().with_variant(String(45), "sqlite")

def get_vector_type(dim=768):
    if PG_Vector is not None:
        return PG_Vector(dim).with_variant(JSON(), "sqlite")
    return JSON()

def get_now_default():
    return func.now()



# Many-to-Many association table for User and Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", get_uuid_type(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", get_uuid_type(), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="department")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", secondary=user_roles, back_populates="roles")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default(), onupdate=datetime.utcnow
    )

    # Relationships
    department: Mapped[Optional[Department]] = relationship("Department", back_populates="users")
    roles: Mapped[List[Role]] = relationship("Role", secondary=user_roles, back_populates="users")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
    startup: Mapped[Optional["Startup"]] = relationship("Startup", back_populates="contact_user", uselist=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), nullable=False)
    before_state: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    after_state: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(get_inet_type(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    owner_type: Mapped[str] = mapped_column(String, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False)
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    file_hash: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    verification_status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    approver_role_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    approver_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_status: Mapped[str] = mapped_column(String, nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    remarks: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(get_uuid_type(), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="notifications")


class Sector(Base):
    __tablename__ = "sectors"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    department_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    raw_problem_text: Mapped[str] = mapped_column(String, nullable=False)
    structured_outcome_json: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    ai_structuring_metadata: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    sector_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("sectors.id", ondelete="RESTRICT"), nullable=False
    )
    budget_ceiling: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String, default="INR", server_default="INR", nullable=False)
    timeline_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    timeline_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", server_default="draft", nullable=False)
    embedding: Mapped[Optional[List[float]]] = mapped_column(get_vector_type(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default(), onupdate=datetime.utcnow
    )

    # Relationships
    department: Mapped[Department] = relationship("Department")
    creator: Mapped[User] = relationship("User")
    sector: Mapped[Sector] = relationship("Sector")
    criteria: Mapped[List["ChallengeEligibilityCriteria"]] = relationship(
        "ChallengeEligibilityCriteria", back_populates="challenge", cascade="all, delete-orphan"
    )


class ChallengeEligibilityCriteria(Base):
    __tablename__ = "challenge_eligibility_criteria"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False
    )
    criteria_key: Mapped[str] = mapped_column(String, nullable=False)
    criteria_value_json: Mapped[dict] = mapped_column(get_json_type(), nullable=False)
    is_waivable: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    waiver_reason_required: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    # Relationships
    challenge: Mapped[Challenge] = relationship("Challenge", back_populates="criteria")


class Startup(Base):
    __tablename__ = "startups"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    registration_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    dpiit_recognition_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sector_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("sectors.id", ondelete="RESTRICT"), nullable=False
    )
    incorporation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    description: Mapped[str] = mapped_column(String, nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    team_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    funding_stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_user_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    embedding: Mapped[Optional[List[float]]] = mapped_column(get_vector_type(768), nullable=True)
    profile_complete: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )

    # Relationships
    contact_user: Mapped[User] = relationship("User", back_populates="startup")
    sector: Mapped[Sector] = relationship("Sector")


class ChallengeApplication(Base):
    __tablename__ = "challenge_applications"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenges.id", ondelete="RESTRICT"), nullable=False
    )
    startup_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("startups.id", ondelete="CASCADE"), nullable=False
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    status: Mapped[str] = mapped_column(String, default="submitted", server_default="submitted", nullable=False)
    ai_match_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    ai_match_explanation: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    challenge: Mapped[Challenge] = relationship("Challenge")
    startup: Mapped[Startup] = relationship("Startup")
    eligibility_results: Mapped[List["EligibilityCheckResult"]] = relationship(
        "EligibilityCheckResult", back_populates="application", cascade="all, delete-orphan"
    )


class EligibilityCheckResult(Base):
    __tablename__ = "eligibility_check_results"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenge_applications.id", ondelete="CASCADE"), nullable=False
    )
    criteria_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenge_eligibility_criteria.id", ondelete="CASCADE"), nullable=False
    )
    rules_engine_passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ai_verification_passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ai_verification_result: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    final_passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    waived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    waiver_justification: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    checked_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )

    # Relationships
    application: Mapped[ChallengeApplication] = relationship("ChallengeApplication", back_populates="eligibility_results")
    criteria: Mapped[ChallengeEligibilityCriteria] = relationship("ChallengeEligibilityCriteria")
    checker: Mapped[Optional[User]] = relationship("User")


class EvaluationCriteria(Base):
    __tablename__ = "evaluation_criteria"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenges.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    max_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    # Relationships
    challenge: Mapped[Challenge] = relationship("Challenge")


class EvaluationPanel(Base):
    __tablename__ = "evaluation_panels"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenges.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    scoring_status: Mapped[str] = mapped_column(String, default="open", server_default="open", nullable=False)

    # Relationships
    challenge: Mapped[Challenge] = relationship("Challenge")
    members: Mapped[List[User]] = relationship(
        "User", secondary="evaluation_panel_members", backref="panels"
    )


class EvaluationPanelMember(Base):
    __tablename__ = "evaluation_panel_members"

    panel_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("evaluation_panels.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenge_applications.id", ondelete="CASCADE"), nullable=False
    )
    evaluator_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    criteria_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("evaluation_criteria.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    prev_hash: Mapped[str] = mapped_column(String, nullable=False)
    row_hash: Mapped[str] = mapped_column(String, nullable=False)

    # Relationships
    application: Mapped[ChallengeApplication] = relationship("ChallengeApplication")
    evaluator: Mapped[User] = relationship("User")
    criteria: Mapped[EvaluationCriteria] = relationship("EvaluationCriteria")


class ScoreOutlierFlag(Base):
    __tablename__ = "score_outlier_flags"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenge_applications.id", ondelete="CASCADE"), nullable=False
    )
    criteria_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("evaluation_criteria.id", ondelete="CASCADE"), nullable=False
    )
    evaluator_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    evaluator_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    panel_average: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    deviation: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    flagged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    application: Mapped[ChallengeApplication] = relationship("ChallengeApplication")
    criteria: Mapped[EvaluationCriteria] = relationship("EvaluationCriteria")
    evaluator: Mapped[User] = relationship("User", foreign_keys=[evaluator_id])
    reviewer: Mapped[Optional[User]] = relationship("User", foreign_keys=[reviewed_by])


class EvaluatorBriefing(Base):
    __tablename__ = "evaluator_briefings"

    application_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenge_applications.id", ondelete="CASCADE"), primary_key=True
    )
    evaluator_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    briefing_text: Mapped[str] = mapped_column(String, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )

    # Relationships
    application: Mapped[ChallengeApplication] = relationship("ChallengeApplication")
    evaluator: Mapped[User] = relationship("User")


class Pilot(Base):
    __tablename__ = "pilots"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("challenge_applications.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    status: Mapped[str] = mapped_column(String, default="not_started", server_default="not_started", nullable=False)
    contract_status: Mapped[str] = mapped_column(String, default="draft", server_default="draft", nullable=False)
    ip_ownership_terms: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    data_ownership_terms: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contract_ai_draft: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    contract_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default(), onupdate=datetime.utcnow
    )
    performance_summary_cache: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)

    # Relationships
    application: Mapped[ChallengeApplication] = relationship("ChallengeApplication")
    contract_document: Mapped[Optional[Document]] = relationship("Document", foreign_keys=[contract_document_id])
    milestones: Mapped[List["PilotMilestone"]] = relationship("PilotMilestone", back_populates="pilot", cascade="all, delete-orphan")
    kpis: Mapped[List["PilotKPI"]] = relationship("PilotKPI", back_populates="pilot", cascade="all, delete-orphan")


class PilotMilestone(Base):
    __tablename__ = "pilot_milestones"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    pilot_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", server_default="pending", nullable=False)
    evidence_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    payment_proof_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    payment_initiated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    payment_initiated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    payment_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    pilot: Mapped[Pilot] = relationship("Pilot", back_populates="milestones")
    evidence_document: Mapped[Optional[Document]] = relationship("Document", foreign_keys=[evidence_document_id])
    payment_proof_document: Mapped[Optional[Document]] = relationship("Document", foreign_keys=[payment_proof_document_id])
    approver: Mapped[Optional[User]] = relationship("User", foreign_keys=[approved_by])
    initiator: Mapped[Optional[User]] = relationship("User", foreign_keys=[payment_initiated_by])
    confirmer: Mapped[Optional[User]] = relationship("User", foreign_keys=[payment_confirmed_by])


class PilotKPI(Base):
    __tablename__ = "pilot_kpis"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    pilot_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False
    )
    kpi_name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    target_direction: Mapped[str] = mapped_column(String, nullable=False)
    target_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    baseline_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    measurement_frequency: Mapped[str] = mapped_column(String, default="monthly", server_default="monthly", nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )

    # Relationships
    pilot: Mapped[Pilot] = relationship("Pilot", back_populates="kpis")
    measurements: Mapped[List["PilotKPIMeasurement"]] = relationship(
        "PilotKPIMeasurement", back_populates="kpi", cascade="all, delete-orphan"
    )


class PilotKPIMeasurement(Base):
    __tablename__ = "pilot_kpi_measurements"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    kpi_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("pilot_kpis.id", ondelete="CASCADE"), nullable=False
    )
    measured_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    measured_by: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    evidence_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    remarks: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    kpi: Mapped[PilotKPI] = relationship("PilotKPI", back_populates="measurements")
    measured_by_user: Mapped[User] = relationship("User", foreign_keys=[measured_by])
    evidence_document: Mapped[Optional[Document]] = relationship("Document", foreign_keys=[evidence_document_id])


class ProcurementDecision(Base):
    __tablename__ = "procurement_decisions"

    id: Mapped[uuid.UUID] = mapped_column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    pilot_id: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True
    )
    decision: Mapped[str] = mapped_column(String(50), nullable=False)  # 'scale_up', 'reject', 'extend_pilot', 'terminate'
    proposed_by: Mapped[uuid.UUID] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    proposed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=get_now_default()
    )
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    contract_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    scale_up_details: Mapped[Optional[dict]] = mapped_column(get_json_type(), nullable=True)
    extended_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="proposed", server_default="proposed", nullable=False)  # 'proposed', 'approved', 'sent_back'
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    finalized_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        get_uuid_type(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    pilot: Mapped[Pilot] = relationship("Pilot", backref="procurement_decisions")
    proposer: Mapped[User] = relationship("User", foreign_keys=[proposed_by])
    finalizer: Mapped[Optional[User]] = relationship("User", foreign_keys=[finalized_by])

