"""module4

Revision ID: 9c0d1e2f3a4b
Revises: 8b9e0f1a2b3c
Create Date: 2026-08-30 10:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9c0d1e2f3a4b'
down_revision: Union[str, None] = '8b9e0f1a2b3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create challenge_applications table
    op.create_table(
        'challenge_applications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('challenge_id', sa.UUID(), nullable=False),
        sa.Column('startup_id', sa.UUID(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.Column('status', sa.String(), server_default='submitted', nullable=False),
        sa.Column('ai_match_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('ai_match_explanation', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['startup_id'], ['startups.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('challenge_id', 'startup_id', name='uq_challenge_startup_application')
    )

    # Create eligibility_check_results table
    op.create_table(
        'eligibility_check_results',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('criteria_id', sa.UUID(), nullable=False),
        sa.Column('rules_engine_passed', sa.Boolean(), nullable=False),
        sa.Column('ai_verification_passed', sa.Boolean(), nullable=True),
        sa.Column('ai_verification_result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('final_passed', sa.Boolean(), nullable=True),
        sa.Column('waived', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('waiver_justification', sa.String(), nullable=True),
        sa.Column('checked_by', sa.UUID(), nullable=True),
        sa.Column('checked_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['challenge_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['criteria_id'], ['challenge_eligibility_criteria.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['checked_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', 'criteria_id', name='uq_application_criteria_result')
    )


def downgrade() -> None:
    op.drop_table('eligibility_check_results')
    op.drop_table('challenge_applications')
