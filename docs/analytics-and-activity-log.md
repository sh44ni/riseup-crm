# Analytics module

Route: `/analytics/:tab` (legacy `/reports` redirects here).

## Add a tab
1. Create `crm/src/features/analytics/tabs/<name>/<Name>Tab.tsx` with a default-exported component.
2. Append one entry to `ANALYTICS_TABS` in `registry.ts` (id, label, icon, permission, lazy component).

Routing, permission gating, tab navigation and lazy loading are derived from the registry.

# Staff activity log

- Table `staff_activity_log`, filled by Postgres triggers on clients, leads, estimates, contracts, jobs, invoices, payments, warranties, inspections, tasks, users and roles. Every code path is captured, including raw SQL and workers.
- The actor (user, role, IP) is passed to the database per request (`app/core/actor_context.py`). Without an actor the row is recorded as `system`.
- Rows are append-only: triggers reject UPDATE, DELETE and TRUNCATE on `staff_activity_log` and `audit_logs`. History of deleted records is kept.
- Passwords, tokens, secrets, keys and similar fields are stripped by `activity_scrub`.
- Security events in `audit_logs` are mirrored into the feed (`source = 'security'`).
- Access: `activity.view` permission (owner by default; assignable in the permission matrix). CSV exports are themselves logged.
- Production note: the application should connect as a non-owner database role. A table owner or superuser can disable triggers.
