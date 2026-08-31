"""module6

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-30 13:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. pilots
    op.create_table(
        'pilots',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('budget', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('status', sa.String(), server_default='not_started', nullable=False),
        sa.Column('contract_status', sa.String(), server_default='draft', nullable=False),
        sa.Column('ip_ownership_terms', sa.String(), nullable=True),
        sa.Column('data_ownership_terms', sa.String(), nullable=True),
        sa.Column('contract_ai_draft', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('contract_document_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['challenge_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contract_document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', name='uq_pilots_application_id')
    )

    # 2. pilot_milestones
    op.create_table(
        'pilot_milestones',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pilot_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('payment_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        sa.Column('evidence_document_id', sa.UUID(), nullable=True),
        sa.Column('approved_by', sa.UUID(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_reference', sa.String(), nullable=True),
        sa.Column('payment_proof_document_id', sa.UUID(), nullable=True),
        sa.Column('payment_initiated_by', sa.UUID(), nullable=True),
        sa.Column('payment_initiated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_confirmed_by', sa.UUID(), nullable=True),
        sa.Column('payment_confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['evidence_document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payment_confirmed_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payment_initiated_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payment_proof_document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['pilot_id'], ['pilots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('pilot_milestones')
    op.drop_table('pilots')
