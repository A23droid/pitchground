"""Support arbitrary-domain topic input without a technical-topic default."""
from alembic import op
import sqlalchemy as sa
revision="003_arbitrary_topics"
down_revision="002_session_setup"
branch_labels=None
depends_on=None

def upgrade():
    with op.batch_alter_table("sessions") as batch:
        batch.alter_column("topic",existing_type=sa.String(128),type_=sa.String(2000),nullable=False,server_default=None)

def downgrade():
    # Keep the wider column: shrinking could truncate legitimate user topics.
    pass
