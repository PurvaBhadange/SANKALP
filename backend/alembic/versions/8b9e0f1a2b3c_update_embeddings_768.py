"""update_embeddings_768

Revision ID: 8b9e0f1a2b3c
Revises: 7a8f9c0d1e2f
Create Date: 2026-08-30 09:48:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8b9e0f1a2b3c'
down_revision: Union[str, None] = '7a8f9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear existing 3072D embeddings so postgres can alter the vector dimension without casting error
    op.execute(sa.text("UPDATE startups SET embedding = NULL;"))
    op.execute(sa.text("UPDATE challenges SET embedding = NULL;"))

    # Update startups.embedding and challenges.embedding to vector(768)
    op.execute(sa.text("ALTER TABLE startups ALTER COLUMN embedding TYPE vector(768) USING NULL::vector(768);"))
    op.execute(sa.text("ALTER TABLE challenges ALTER COLUMN embedding TYPE vector(768) USING NULL::vector(768);"))


def downgrade() -> None:
    op.execute(sa.text("UPDATE startups SET embedding = NULL;"))
    op.execute(sa.text("UPDATE challenges SET embedding = NULL;"))
    op.execute(sa.text("ALTER TABLE startups ALTER COLUMN embedding TYPE vector(3072) USING NULL::vector(3072);"))
    op.execute(sa.text("ALTER TABLE challenges ALTER COLUMN embedding TYPE vector(3072) USING NULL::vector(3072);"))
