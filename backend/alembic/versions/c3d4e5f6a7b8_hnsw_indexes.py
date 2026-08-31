"""add hnsw vector indexes

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-30

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS idx_startups_embedding_hnsw ON startups USING hnsw (embedding vector_cosine_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_challenges_embedding_hnsw ON challenges USING hnsw (embedding vector_cosine_ops);")

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_startups_embedding_hnsw;")
    op.execute("DROP INDEX IF EXISTS idx_challenges_embedding_hnsw;")
