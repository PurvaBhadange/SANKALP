"""module8 procurement decisions

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-31

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'procurement_decisions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('pilot_id', UUID(as_uuid=True), sa.ForeignKey('pilots.id', ondelete='CASCADE'), nullable=False),
        sa.Column('decision', sa.String(50), nullable=False),
        sa.Column('proposed_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('proposed_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.Column('justification', sa.Text(), nullable=False),
        sa.Column('contract_value', sa.Numeric(14, 2), nullable=True),
        sa.Column('scale_up_details', JSONB, nullable=True),
        sa.Column('extended_end_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(50), server_default='proposed', nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('finalized_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('finalized_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_procurement_decisions_pilot_id', 'procurement_decisions', ['pilot_id'])

def downgrade() -> None:
    op.drop_index('ix_procurement_decisions_pilot_id', table_name='procurement_decisions')
    op.drop_table('procurement_decisions')
