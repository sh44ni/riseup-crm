"""0002_p5_session_and_actor_tracking

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-04 02:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    # 1. admin_sessions: add id, ip_address, user_agent, last_seen_at
    if "admin_sessions" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("admin_sessions")}
        if "id" not in existing_cols:
            op.execute("ALTER TABLE admin_sessions ADD COLUMN id BIGSERIAL")
        if "ip_address" not in existing_cols:
            op.add_column("admin_sessions", sa.Column("ip_address", sa.Text(), nullable=True))
        if "user_agent" not in existing_cols:
            op.add_column("admin_sessions", sa.Column("user_agent", sa.Text(), nullable=True))
        if "last_seen_at" not in existing_cols:
            op.add_column(
                "admin_sessions",
                sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
            )

    # 2. audit_logs: add actor_type, actor_id
    if "audit_logs" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("audit_logs")}
        if "actor_type" not in existing_cols:
            op.add_column("audit_logs", sa.Column("actor_type", sa.String(length=32), server_default="user", nullable=False))
        if "actor_id" not in existing_cols:
            op.add_column("audit_logs", sa.Column("actor_id", sa.String(length=64), nullable=True))

    # 3. activities: add actor_type, actor_id
    if "activities" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("activities")}
        if "actor_type" not in existing_cols:
            op.add_column("activities", sa.Column("actor_type", sa.String(length=32), server_default="user", nullable=False))
        if "actor_id" not in existing_cols:
            op.add_column("activities", sa.Column("actor_id", sa.String(length=64), nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    if "admin_sessions" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("admin_sessions")}
        if "last_seen_at" in existing_cols:
            op.drop_column("admin_sessions", "last_seen_at")
        if "user_agent" in existing_cols:
            op.drop_column("admin_sessions", "user_agent")
        if "ip_address" in existing_cols:
            op.drop_column("admin_sessions", "ip_address")
        if "id" in existing_cols:
            op.drop_column("admin_sessions", "id")

    if "audit_logs" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("audit_logs")}
        if "actor_id" in existing_cols:
            op.drop_column("audit_logs", "actor_id")
        if "actor_type" in existing_cols:
            op.drop_column("audit_logs", "actor_type")

    if "activities" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("activities")}
        if "actor_id" in existing_cols:
            op.drop_column("activities", "actor_id")
        if "actor_type" in existing_cols:
            op.drop_column("activities", "actor_type")
