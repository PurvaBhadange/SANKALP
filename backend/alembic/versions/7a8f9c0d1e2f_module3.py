"""module3

Revision ID: 7a8f9c0d1e2f
Revises: 437acdb6b0f2
Create Date: 2026-08-30 09:30:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector

# revision identifiers, used by Alembic.
revision: str = '7a8f9c0d1e2f'
down_revision: Union[str, None] = '437acdb6b0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure vector extension exists
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))

    # Alter challenges.embedding column to VECTOR(3072)
    op.execute(sa.text("ALTER TABLE challenges ALTER COLUMN embedding TYPE vector(3072) USING embedding::vector(3072);"))

    # Create startups table
    op.create_table(
        'startups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('registration_number', sa.String(), nullable=False),
        sa.Column('dpiit_recognition_number', sa.String(), nullable=True),
        sa.Column('sector_id', sa.UUID(), nullable=False),
        sa.Column('incorporation_date', sa.Date(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('website', sa.String(), nullable=True),
        sa.Column('team_size', sa.Integer(), nullable=True),
        sa.Column('funding_stage', sa.String(), nullable=True),
        sa.Column('contact_user_id', sa.UUID(), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=3072), nullable=True),
        sa.Column('profile_complete', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("TIMEZONE('utc', NOW())"), nullable=False),
        sa.ForeignKeyConstraint(['contact_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sector_id'], ['sectors.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration_number'),
        sa.UniqueConstraint('contact_user_id')
    )


def downgrade() -> None:
    op.drop_table('startups')
    op.execute(sa.text("ALTER TABLE challenges ALTER COLUMN embedding TYPE vector(768) USING embedding::vector(768);"))
