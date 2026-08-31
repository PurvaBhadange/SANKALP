"""module5

Revision ID: a1b2c3d4e5f6
Revises: 9c0d1e2f3a4b
Create Date: 2026-08-30 11:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c0d1e2f3a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. evaluation_criteria
    op.create_table(
        'evaluation_criteria',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('challenge_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('weight', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('max_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. evaluation_panels
    op.create_table(
        'evaluation_panels',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('challenge_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('scoring_status', sa.String(), server_default='open', nullable=False),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('challenge_id', name='uq_evaluation_panels_challenge_id')
    )

    # 3. evaluation_panel_members
    op.create_table(
        'evaluation_panel_members',
        sa.Column('panel_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['panel_id'], ['evaluation_panels.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('panel_id', 'user_id')
    )

    # 4. evaluation_scores
    op.create_table(
        'evaluation_scores',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('evaluator_id', sa.UUID(), nullable=False),
        sa.Column('criteria_id', sa.UUID(), nullable=False),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('comments', sa.String(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.Column('prev_hash', sa.String(), nullable=False),
        sa.Column('row_hash', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['challenge_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['criteria_id'], ['evaluation_criteria.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['evaluator_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', 'evaluator_id', 'criteria_id', name='uq_eval_score_app_eval_crit')
    )

    # 5. score_outlier_flags
    op.create_table(
        'score_outlier_flags',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('criteria_id', sa.UUID(), nullable=False),
        sa.Column('evaluator_id', sa.UUID(), nullable=False),
        sa.Column('evaluator_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('panel_average', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('deviation', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('flagged_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.Column('reviewed_by', sa.UUID(), nullable=True),
        sa.Column('review_note', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['challenge_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['criteria_id'], ['evaluation_criteria.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['evaluator_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. evaluator_briefings
    op.create_table(
        'evaluator_briefings',
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('evaluator_id', sa.UUID(), nullable=False),
        sa.Column('briefing_text', sa.String(), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['challenge_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['evaluator_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('application_id', 'evaluator_id')
    )


def downgrade() -> None:
    op.drop_table('evaluator_briefings')
    op.drop_table('score_outlier_flags')
    op.drop_table('evaluation_scores')
    op.drop_table('evaluation_panel_members')
    op.drop_table('evaluation_panels')
    op.drop_table('evaluation_criteria')
