"""store interview setup on sessions

Revision ID: 002_session_setup
Revises: 001_initial
Create Date: 2026-10-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_session_setup"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("sessions")}
    if "mode" not in cols:
        op.add_column("sessions", sa.Column("mode", sa.String(32), nullable=False, server_default="interview"))
    if "audience" not in cols:
        op.add_column("sessions", sa.Column("audience", sa.String(64), nullable=False, server_default=""))
    if "language" not in cols:
        op.add_column("sessions", sa.Column("language", sa.String(32), nullable=False, server_default="English"))
    if "difficulty" not in cols:
        op.add_column("sessions", sa.Column("difficulty", sa.String(32), nullable=False, server_default="Standard"))


def downgrade() -> None:
    op.drop_column("sessions", "difficulty")
    op.drop_column("sessions", "language")
    op.drop_column("sessions", "audience")
    op.drop_column("sessions", "mode")
