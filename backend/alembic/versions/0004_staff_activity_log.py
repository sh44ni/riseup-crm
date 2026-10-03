"""0004_staff_activity_log

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-04 04:40:00.000000

Tamper-proof employee activity trail captured by database triggers:

* ``staff_activity_log`` is append-only (UPDATE/DELETE/TRUNCATE are rejected by triggers).
* Row triggers on the business tables record who/when/what plus old and new values,
  with credentials stripped inside the trigger itself.
* Security events written to ``audit_logs`` are mirrored into the same feed.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

# (table, label columns, client-id column, columns whose values are too large to store)
AUDITED_TABLES = [
    ("clients", "full_name", "id", ""),
    ("leads", "full_name", "client_id", ""),
    ("estimates", "estimate_number,customer_name", "client_id", "proposal_data,addons"),
    ("contracts", "contract_number", "client_id", "contract_data"),
    ("jobs", "job_number,customer_name", "client_id", "milestones"),
    ("invoices", "invoice_number,milestone_name", "client_id", ""),
    ("payments", "invoice_id", "", ""),
    ("warranties", "warranty_number", "client_id", ""),
    ("inspections", "inspection_number", "client_id", "findings"),
    ("tasks", "title", "client_id", ""),
    ("users", "name", "", ""),
    ("roles", "name", "", ""),
]

REDACT_REGEX = (
    "(^|_)(password|passwd|secret|token|api_?key|key_hash|salt|csrf|otp|mfa|credential|ssn|private_key)(_|$)"
    "|signature_data|card_number"
)

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS staff_activity_log (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'data',
    action TEXT NOT NULL,
    actor_type TEXT NOT NULL DEFAULT 'system',
    actor_user_id BIGINT,
    actor_name TEXT,
    actor_email TEXT,
    actor_role TEXT,
    ip_address TEXT,
    table_name TEXT NOT NULL,
    record_id TEXT,
    record_label TEXT,
    client_id BIGINT,
    changed_fields TEXT[] NOT NULL DEFAULT '{}',
    categories TEXT[] NOT NULL DEFAULT '{}',
    changes JSONB,
    old_values JSONB,
    new_values JSONB
)
"""

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_activity_occurred ON staff_activity_log (occurred_at DESC, id DESC)",
    "CREATE INDEX IF NOT EXISTS idx_activity_actor ON staff_activity_log (actor_user_id, occurred_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_activity_client ON staff_activity_log (client_id, occurred_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_activity_record ON staff_activity_log (table_name, record_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_action ON staff_activity_log (action)",
    "CREATE INDEX IF NOT EXISTS idx_activity_categories ON staff_activity_log USING GIN (categories)",
]

SCRUB_FN = f"""
CREATE OR REPLACE FUNCTION activity_scrub(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
    SELECT coalesce(jsonb_object_agg(key, value), '{{}}'::jsonb)
    FROM jsonb_each(coalesce(j, '{{}}'::jsonb))
    WHERE key !~* '{REDACT_REGEX}'
      AND key NOT IN ('updated_at', 'last_login_at')
$$
"""

OMIT_FN = """
CREATE OR REPLACE FUNCTION activity_omit(j jsonb, omit text[]) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
    SELECT coalesce(jsonb_object_agg(key, CASE WHEN key = ANY(omit) THEN '"[omitted]"'::jsonb ELSE value END), '{}'::jsonb)
    FROM jsonb_each(coalesce(j, '{}'::jsonb))
$$
"""

CATEGORIES_FN = """
CREATE OR REPLACE FUNCTION activity_categories(fields text[]) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
    SELECT coalesce(array_agg(DISTINCT c ORDER BY c), '{}'::text[]) FROM (
        SELECT CASE
            WHEN f ~ '^(assigned_to|assigned_to_user_id|assigned_by_user_id|assigned_at|project_manager_id|foreman_id|crew_lead|crew_members|acquired_by_user_id|role)$' THEN 'assignment'
            WHEN f ~ '^(status|pipeline_stage|stage|lost_reason|lost_notes|lost_at|permit_status|material_status|client_category|is_active|is_archived)$' THEN 'status'
            WHEN f ~ '^(full_name|name|phone|phone_normalized|secondary_phone|email|address|city|zip|customer_name|customer_phone|customer_email|customer_address|customer_city|customer_zip)$' THEN 'contact'
            WHEN f ~ '^(amount|total|subtotal|contract_value|estimated_value|margin_pct|material_cost|labor_cost|monthly_payment|paid_at|payment_method|total_revenue)$' THEN 'financial'
            ELSE 'other'
        END AS c
        FROM unnest(fields) AS f
    ) cats
$$
"""

CAPTURE_FN = """
CREATE OR REPLACE FUNCTION activity_capture() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    label_cols text[] := string_to_array(coalesce(TG_ARGV[0], ''), ',');
    client_col text := nullif(TG_ARGV[1], '');
    omit text[] := string_to_array(coalesce(TG_ARGV[2], ''), ',');
    v_old jsonb;
    v_new jsonb;
    v_row jsonb;
    v_changes jsonb;
    v_fields text[];
    v_label text;
    v_client bigint;
    v_action text;
    v_cats text[] := '{}';
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_row := to_jsonb(NEW); v_action := 'create';
        v_new := activity_omit(activity_scrub(v_row), omit);
    ELSIF TG_OP = 'UPDATE' THEN
        v_row := to_jsonb(NEW); v_action := 'update';
        v_old := activity_scrub(to_jsonb(OLD));
        v_new := activity_scrub(v_row);
        SELECT jsonb_object_agg(k, jsonb_build_object(
                   'old', CASE WHEN k = ANY(omit) THEN '"[omitted]"'::jsonb ELSE v_old -> k END,
                   'new', CASE WHEN k = ANY(omit) THEN '"[omitted]"'::jsonb ELSE v_new -> k END)),
               array_agg(k ORDER BY k)
          INTO v_changes, v_fields
          FROM (SELECT key AS k FROM jsonb_each(v_new) UNION SELECT key FROM jsonb_each(v_old)) AS keys
         WHERE (v_old -> k) IS DISTINCT FROM (v_new -> k);
        IF v_fields IS NULL THEN
            RETURN NEW;
        END IF;
        v_cats := activity_categories(v_fields);
        v_old := NULL; v_new := NULL;
    ELSE
        v_row := to_jsonb(OLD); v_action := 'delete';
        v_old := activity_omit(activity_scrub(v_row), omit);
    END IF;

    SELECT string_agg(v_row ->> c, ' ') INTO v_label
      FROM unnest(label_cols) AS c WHERE coalesce(v_row ->> c, '') <> '';
    IF client_col IS NOT NULL THEN
        v_client := nullif(v_row ->> client_col, '')::bigint;
    END IF;

    INSERT INTO staff_activity_log (
        source, action, actor_type, actor_user_id, actor_name, actor_email, actor_role, ip_address,
        table_name, record_id, record_label, client_id, changed_fields, categories,
        changes, old_values, new_values
    ) VALUES (
        'data', v_action,
        coalesce(nullif(current_setting('app.actor_type', true), ''), 'system'),
        nullif(current_setting('app.actor_user_id', true), '')::bigint,
        nullif(current_setting('app.actor_name', true), ''),
        nullif(current_setting('app.actor_email', true), ''),
        nullif(current_setting('app.actor_role', true), ''),
        nullif(current_setting('app.actor_ip', true), ''),
        TG_TABLE_NAME, v_row ->> 'id', v_label, v_client,
        coalesce(v_fields, '{}'), v_cats,
        v_changes, v_old, v_new
    );
    RETURN NULL;
END
$$
"""

MIRROR_FN = """
CREATE OR REPLACE FUNCTION activity_mirror_security() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO staff_activity_log (
        occurred_at, source, action, actor_type, actor_user_id, actor_name, actor_email, actor_role,
        ip_address, table_name, record_id, record_label, categories, changes
    ) VALUES (
        NEW.created_at, 'security', NEW.action, coalesce(NEW.actor_type, 'user'), NEW.user_id,
        (SELECT name FROM users WHERE id = NEW.user_id), NEW.user_email, NEW.user_role,
        NEW.ip_address, NEW.resource_type, NEW.resource_id,
        NEW.resource_type || ' ' || coalesce(NEW.resource_id, ''), ARRAY['security'],
        activity_scrub(NEW.changes)
    );
    RETURN NULL;
END
$$
"""

BLOCK_FN = """
CREATE OR REPLACE FUNCTION activity_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are append-only: % on % is not permitted', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'insufficient_privilege';
END
$$
"""

BACKFILL = """
INSERT INTO staff_activity_log (
    occurred_at, source, action, actor_type, actor_user_id, actor_name, actor_email, actor_role,
    ip_address, table_name, record_id, record_label, categories, changes
)
SELECT a.created_at, 'security', a.action, coalesce(a.actor_type, 'user'), a.user_id,
       (SELECT u.name FROM users u WHERE u.id = a.user_id), a.user_email, a.user_role,
       a.ip_address, a.resource_type, a.resource_id,
       a.resource_type || ' ' || coalesce(a.resource_id, ''), ARRAY['security'],
       activity_scrub(a.changes)
FROM audit_logs a
WHERE NOT EXISTS (SELECT 1 FROM staff_activity_log WHERE source = 'security')
ORDER BY a.id
"""


def _exec(sql: str) -> None:
    op.execute(sa.text(sql))


def upgrade() -> None:
    conn = op.get_bind()
    tables = set(Inspector.from_engine(conn).get_table_names())

    _exec(CREATE_TABLE)
    for stmt in INDEXES:
        _exec(stmt)
    for fn in (SCRUB_FN, OMIT_FN, CATEGORIES_FN, CAPTURE_FN, MIRROR_FN, BLOCK_FN):
        _exec(fn)

    if "audit_logs" in tables:
        _exec(BACKFILL)

    # Append-only protection for the activity feed and the raw security log.
    protected = ["staff_activity_log"] + (["audit_logs"] if "audit_logs" in tables else [])
    for table in protected:
        _exec(f"DROP TRIGGER IF EXISTS trg_{table}_immutable_row ON {table}")
        _exec(
            f"CREATE TRIGGER trg_{table}_immutable_row BEFORE UPDATE OR DELETE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION activity_block_mutation()"
        )
        _exec(f"DROP TRIGGER IF EXISTS trg_{table}_immutable_truncate ON {table}")
        _exec(
            f"CREATE TRIGGER trg_{table}_immutable_truncate BEFORE TRUNCATE ON {table} "
            "FOR EACH STATEMENT EXECUTE FUNCTION activity_block_mutation()"
        )

    if "audit_logs" in tables:
        _exec("DROP TRIGGER IF EXISTS trg_audit_logs_mirror ON audit_logs")
        _exec(
            "CREATE TRIGGER trg_audit_logs_mirror AFTER INSERT ON audit_logs "
            "FOR EACH ROW EXECUTE FUNCTION activity_mirror_security()"
        )

    for table, labels, client_col, omit in AUDITED_TABLES:
        if table not in tables:
            continue
        _exec(f"DROP TRIGGER IF EXISTS trg_activity_{table} ON {table}")
        _exec(
            f"CREATE TRIGGER trg_activity_{table} AFTER INSERT OR UPDATE OR DELETE ON {table} "
            f"FOR EACH ROW EXECUTE FUNCTION activity_capture('{labels}', '{client_col}', '{omit}')"
        )


def downgrade() -> None:
    # The audit trail is intentionally append-only; downgrading would destroy history.
    raise RuntimeError("0004_staff_activity_log cannot be downgraded: audit history must be preserved")
