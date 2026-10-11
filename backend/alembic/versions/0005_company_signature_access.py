"""0005_company_signature_access

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-11 04:30:00.000000

Replaces the per-user "Authorized Signatory" model with a single company contractor
signature (Edith Guerrero) and a four-level role permission:

* ``roles.signature_access`` ('none' | 'view' | 'use' | 'edit') replaces the boolean
  ``roles.is_authorized_signatory``. Owner/Administrator default to 'edit', former
  signatory roles become 'use'.
* ``company_signature_versions`` is an append-only version history. The current
  signature is the row with the highest ``version``; every change after the first
  configuration must carry a reason.
* Per-user signature columns on ``users`` are dropped (the new signature starts empty
  and is set up from Settings).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


CREATE_VERSIONS = """
CREATE TABLE IF NOT EXISTS company_signature_versions (
    id BIGSERIAL PRIMARY KEY,
    version INTEGER NOT NULL UNIQUE CHECK (version > 0),
    action TEXT NOT NULL CHECK (action IN ('configured', 'updated')),
    signer_name TEXT NOT NULL CHECK (length(btrim(signer_name)) > 0),
    signer_title TEXT NOT NULL CHECK (length(btrim(signer_title)) > 0),
    signature_type TEXT NOT NULL CHECK (signature_type IN ('typed', 'drawn')),
    signature_data TEXT NOT NULL CHECK (length(btrim(signature_data)) > 0),
    reason TEXT,
    changed_fields TEXT[] NOT NULL DEFAULT '{}',
    changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name TEXT NOT NULL,
    changed_by_email TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT company_signature_reason_required CHECK (
        action = 'configured' OR (reason IS NOT NULL AND length(btrim(reason)) >= 5)
    )
)
"""

# Mirrors 0004's helper so this migration is self-contained even if 0004's function was altered.
BLOCK_FN = """
CREATE OR REPLACE FUNCTION activity_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are append-only: % on % is not permitted', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'insufficient_privilege';
END
$$
"""


def _exec(sql: str) -> None:
    op.execute(sa.text(sql))


def _columns(conn, table: str) -> set:
    return {c["name"] for c in Inspector.from_engine(conn).get_columns(table)}


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Role-level signature access
    role_cols = _columns(conn, "roles")
    if "signature_access" not in role_cols:
        _exec("ALTER TABLE roles ADD COLUMN signature_access TEXT NOT NULL DEFAULT 'none'")
        _exec(
            "ALTER TABLE roles ADD CONSTRAINT roles_signature_access_check "
            "CHECK (signature_access IN ('none', 'view', 'use', 'edit'))"
        )
    if "is_authorized_signatory" in role_cols:
        _exec("UPDATE roles SET signature_access = 'use' WHERE is_authorized_signatory = true")
    _exec(
        "UPDATE roles SET signature_access = 'edit' "
        "WHERE lower(btrim(name)) IN ('owner', 'administrator', 'admin')"
    )
    if "is_authorized_signatory" in role_cols:
        _exec("ALTER TABLE roles DROP COLUMN is_authorized_signatory")

    # 2. Per-user signatures are retired
    user_cols = _columns(conn, "users")
    for col in ("signature_data", "signature_type", "signature_title"):
        if col in user_cols:
            _exec(f"ALTER TABLE users DROP COLUMN {col}")

    # 3. Append-only company signature history
    _exec(CREATE_VERSIONS)
    _exec(
        "CREATE INDEX IF NOT EXISTS idx_company_signature_versions_created "
        "ON company_signature_versions (created_at DESC)"
    )
    _exec(BLOCK_FN)
    _exec("DROP TRIGGER IF EXISTS trg_company_signature_versions_immutable_row ON company_signature_versions")
    _exec(
        "CREATE TRIGGER trg_company_signature_versions_immutable_row "
        "BEFORE UPDATE OR DELETE ON company_signature_versions "
        "FOR EACH ROW EXECUTE FUNCTION activity_block_mutation()"
    )
    _exec("DROP TRIGGER IF EXISTS trg_company_signature_versions_immutable_truncate ON company_signature_versions")
    _exec(
        "CREATE TRIGGER trg_company_signature_versions_immutable_truncate "
        "BEFORE TRUNCATE ON company_signature_versions "
        "FOR EACH STATEMENT EXECUTE FUNCTION activity_block_mutation()"
    )


def downgrade() -> None:
    conn = op.get_bind()
    has_history = conn.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM company_signature_versions)")
    ).scalar()
    if has_history:
        # The signature history is a legal record and is append-only.
        raise RuntimeError(
            "0005_company_signature_access cannot be downgraded: company signature history must be preserved"
        )

    _exec("DROP TABLE IF EXISTS company_signature_versions")

    user_cols = _columns(conn, "users")
    if "signature_data" not in user_cols:
        _exec("ALTER TABLE users ADD COLUMN signature_data TEXT")
    if "signature_type" not in user_cols:
        _exec("ALTER TABLE users ADD COLUMN signature_type TEXT DEFAULT 'typed'")
    if "signature_title" not in user_cols:
        _exec("ALTER TABLE users ADD COLUMN signature_title TEXT DEFAULT 'Project Manager'")

    role_cols = _columns(conn, "roles")
    if "is_authorized_signatory" not in role_cols:
        _exec("ALTER TABLE roles ADD COLUMN is_authorized_signatory BOOLEAN NOT NULL DEFAULT false")
    if "signature_access" in role_cols:
        _exec("UPDATE roles SET is_authorized_signatory = (signature_access IN ('use', 'edit'))")
        _exec("ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_signature_access_check")
        _exec("ALTER TABLE roles DROP COLUMN signature_access")
