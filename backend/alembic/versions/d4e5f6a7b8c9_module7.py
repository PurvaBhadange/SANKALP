"""module7 kpi measurement

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Add performance_summary_cache to pilots
    op.add_column('pilots', sa.Column('performance_summary_cache', JSONB, nullable=True))

    # 2. Create pilot_kpis table
    op.create_table(
        'pilot_kpis',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('pilot_id', UUID(as_uuid=True), sa.ForeignKey('pilots.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kpi_name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('target_direction', sa.String(), nullable=False),
        sa.Column('target_value', sa.Numeric(14, 2), nullable=True),
        sa.Column('baseline_value', sa.Numeric(14, 2), nullable=True),
        sa.Column('measurement_frequency', sa.String(), server_default='monthly', nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False)
    )

    # 3. Create pilot_kpi_measurements table
    op.create_table(
        'pilot_kpi_measurements',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('kpi_id', UUID(as_uuid=True), sa.ForeignKey('pilot_kpis.id', ondelete='CASCADE'), nullable=False),
        sa.Column('measured_value', sa.Numeric(14, 2), nullable=False),
        sa.Column('measured_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.Column('measured_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('evidence_document_id', UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('remarks', sa.String(), nullable=True)
    )

def downgrade() -> None:
    op.drop_table('pilot_kpi_measurements')
    op.drop_table('pilot_kpis')
    op.drop_column('pilots', 'performance_summary_cache')
