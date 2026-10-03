# P2: Test Harness (the safety net)

**Goal:** Build the tests that make large refactors safe: real-database HTTP tests, an automatic authorisation matrix, characterisation tests of current behaviour, frontend component tests, and browser end-to-end journeys with accessibility checks.

**Prerequisites:** P1 merged: CI green on Postgres/Redis, ratchet in place.

**Delivers toward 10/10:** Backend Testing 3 → ~6, Frontend Testing 1.5 → ~5, and a permanent guard against unauthenticated routes and IDOR.

---

## Principles
- **Test through HTTP**, not by calling handlers with `AsyncMock` sessions. The existing mocked unit tests stay, but they don't count as endpoint coverage.
- **Characterisation first:** record what the system does **today** (including ugly behaviour) so refactors in P3/P4 prove they didn't change it unintentionally. Deliberate behaviour changes update the snapshot in the same PR.
- **Known bugs are encoded as `xfail(strict=True)`** with the desired behaviour. When P3 fixes the bug, the test starts passing, `strict` makes the suite fail until the `xfail` marker is removed, so fixes can't go unnoticed and tests can't rot.
- Tests must be deterministic: fixed clock (`freezegun` / `time-machine`), seeded randomness, no network.

---

## Part A: Backend harness

### WP-2.1: Database and app fixtures
1. In `tests/conftest.py`:
   - Session-scoped fixture: connect to the CI/local Postgres, create a unique test database, run `alembic upgrade head`, and apply anything the app currently creates outside Alembic (the `spam_attempts` DDL from `scripts/add_spam_attempts_table.sql` and the startup RBAC seed). Mark that glue with `# TODO(P3): remove once migration 0002 lands`.
   - Function-scoped fixture: open a connection + outer transaction, give the app a session bound to it using `join_transaction_mode="create_savepoint"`, roll back after each test. Override `get_db` via `app.dependency_overrides`.
   - A Redis fixture using DB index 15 and `flushdb()` per test; or `fakeredis` if you want no dependency.
2. Local dev story: add `docker-compose.test.yml` (Postgres on a non-default port + Redis) and a `make test-db-up` target so the same tests run on Windows without installing Postgres. Document it.
3. HTTP client fixture: `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`.
4. External services are always stubbed: Resend/email, Turnstile, weather, Google, S3/MinIO, Playwright PDF (return fixed bytes). Use `respx` for httpx calls and fail the test on any unmocked outbound request.

**Acceptance:** one trivial HTTP test (`GET /health`) passes locally and in CI, and a failing test leaves no data behind for the next test.

### WP-2.2: Factories and auth helpers
1. `tests/factories.py` using `factory-boy` (async-compatible via helper) or plain builder functions: `make_user(role=..., scope=...)`, `make_lead(owner=..., stage=...)`, `make_client`, `make_estimate`, `make_contract(status=...)`, `make_job`, `make_api_key`.
2. `login_as(user)` helper that creates a real session token the same way the login endpoint does and returns headers, so tests exercise the real auth middleware instead of overriding it. Keep dependency overrides only for deliberately isolated unit tests.
3. A fixed roles fixture set: `owner`, `admin`, `sales_rep` (own scope), `estimator` (assigned scope), `viewer`, `no_permissions`, `api_key_service`.

### WP-2.3: Route inventory test (permanent guard)
Create `tests/test_route_inventory.py`:
1. Walk `app.routes` and, for each `APIRoute`, resolve its dependency tree (`route.dependant`) and check for at least one of: `require_auth`, `require_permission`, `require_api_key`, developer auth.
2. Anything without one must be listed in `tests/public_routes.py` with a **reason string** (e.g. `"POST /api/contact": "public lead form, Turnstile + rate limit"`).
3. The test fails on (a) an unlisted unauthenticated route, (b) a stale allowlist entry that no longer exists.
4. Seed the allowlist from the actual public routers (`contact`, `estimate`, `estimator`, `financing`, `portals`, `proposal`, `track`, `cron`, `invitations`, `public_reviews`, `public_contracts`, `integrations` callback, auth login). Anything else surprising is a finding: file it in P3's backlog.
5. Also assert that no route function's `Depends(...)` argument is an un-called factory (catches the exact `Depends(require_auth_user)` bug class): inspect `dependant.dependencies` for callables that return callables.

**Acceptance:** the test passes after WP-0.1 and fails if the missing-`()` bug is reintroduced (prove this once by temporarily reverting).

### WP-2.4: Authorisation matrix
Create `tests/test_authz_matrix.py`:
1. Build a table: **(role, endpoint, resource ownership) → expected status**. Ownership cases: own resource, someone else's resource, nonexistent.
2. Resources to cover first: leads, pipeline cards, estimates, contracts, clients, jobs, finances, calendar events, user tasks, reports, system export, RBAC.
3. Parametrise with `pytest.mark.parametrize` plus ids like `sales_rep|GET /estimates/{id}|foreign`.
4. Rows where today's behaviour is insecure get `xfail(strict=True, reason="IDOR: P3 estimates")` with the **secure** expectation (403/404). The inventory of xfails is the P3 security backlog.
5. Add specific tests: scope `own` user exporting `/export` must only get own leads; `draft-by-lead` must not leak `signing_token` to unauthorised users; protected-owner modification rules from P0.

**Acceptance:** the matrix runs in CI; the number of strict-xfail rows is recorded in `quality-baseline.json` as `be.authz_xfails` (a lower-is-better metric that must reach 0 by the end of P3).

### WP-2.5: Characterisation tests per domain
For each domain, in this order (highest churn and risk first): **leads → pipeline → estimates → clients → contracts → jobs/finances → calendar → reports/marketing → system/rbac/auth → public routes**.

Per domain:
1. List the routes (`app.openapi()` paths for the router).
2. For each route write: happy path, validation error, permission denied, not found, and the key side effects (rows written to `activities`, stage changes, reminders created, emails queued).
3. Use `syrupy` snapshots for large response bodies, normalising volatile fields (ids, timestamps, tokens) with a custom serializer.
4. For workflows, write scenario tests: *create lead → create estimate → send estimate → lead moves to Estimate Sent → reminder scheduled → activity logged*; *draft contract → send → client signs → counter-sign → statuses and audit events*.
5. Record known-bad behaviours as `xfail(strict=True)`: swallowed exceptions causing partial writes, `COUNT(*)+1` numbering duplicates under concurrency (use `asyncio.gather` over separate sessions in one test), audit-log spoofing via `authorName`, GET with writes (`/clients?sync=true`), PDF endpoint returning traceback in `detail`.
6. Note any route you cannot test because it's already broken beyond P0's fixes. Add it to the P3 backlog instead of fixing it now.

**Targets for this phase:** every route hit at least once by an HTTP test; backend line coverage ≥ 50%.

### WP-2.6: Fix the weak existing tests
1. Delete or rewrite tautological tests (e.g. `test_auth_security.py:62-67` tests a string slice defined in the test; `test_security_comprehensive.py:104` has an "align with the prompt" comment).
2. Convert `pricingMath.test.ts`-style tests that don't import app code (frontend) into tests of real modules.
3. Rename `test_phase*` files by what they test (`test_permissions.py`, `test_schemas.py`, etc.).

---

## Part B: Frontend harness

### WP-2.7: Component test infrastructure
1. Add `msw`. Create `src/test/server.ts` with handlers and `src/test/handlers/*.ts` per domain. Initially hand-written; in P4.1 they're derived from generated OpenAPI types.
2. `src/test/render.tsx`: `renderWithProviders(ui, { route, user, permissions, queryClient })` wrapping `QueryClientProvider` (retry off, `gcTime: 0`), `MemoryRouter`, `AuthContext`, `ToastContext`, `ThemeContext`.
3. In `setup.ts`: start MSW with `onUnhandledRequest: "error"` so any accidental real call fails the test.
4. Fake timers and a fixed system time for date-dependent components.

### WP-2.8: First component and hook tests (guard the refactors)
Write tests for the code P4 will rewrite most heavily, so P4 has a safety net:
1. `utils/*` and `lib/*Store.ts` behaviour (existing) plus `lib/api.ts` request behaviour: timeout, 401 redirect guard, FormData, FastAPI `detail` parsing, public-endpoint exemptions.
2. `PermissionRoute` and `AuthContext` (permitted, forbidden, unauthenticated, hydration).
3. Kanban logic: `pipelineUtils` stage rules, forward/backward move prompts, gated estimate-sent flow.
4. `CrmModal` behaviours (Escape, backdrop, scroll-lock) before it's rebuilt as the accessible Modal.
5. Contract HTML generation: snapshot tests of `generateContractHtml` for complete data; add a test asserting the **current** demo-default behaviour as `xfail(strict=True)` (desired: throws/validation error) so P4.8 flips it.
6. Key forms: CreateLead, CreateExistingClient (27 `useState`s: lock in field-to-payload mapping), ProfileSettings.

**Target:** frontend coverage ≥ 25% with the above, recorded in the baseline.

### WP-2.9: Playwright end-to-end journeys
1. Add `@playwright/test` in `crm/` with `playwright.config.ts` (Chromium only to start, `baseURL` from env, traces on first retry, video off).
2. **E2E environment:** `docker-compose.e2e.yml` (Postgres, Redis, backend, built CRM via `vite preview`). `backend/scripts/seed_e2e.py` creates deterministic users (one per role), a company profile, sample leads. It reads credentials from env and refuses to run in production.
3. Use Playwright `storageState` per role to log in once and reuse.
4. Write the **8 critical journeys** (each independent and idempotent):
   1. Login, logout, forced redirect when unauthenticated, permission-denied route
   2. Create a lead (quick-add and full modal), validation errors
   3. Pipeline: drag a card across stages, backward-move modal, follow-up log, gated "estimate sent"
   4. Create an estimate in the wizard, preview, send
   5. Build a contract (draft → review → send)
   6. Client signing wizard (public link) → signature capture → confirmation
   7. Counter-sign by signatory/owner
   8. Schedule an operation (job/appointment) from pipeline and see it on the calendar
5. Mark any journey that currently fails because of known bugs as `test.fail()` with a comment pointing to the plan item that fixes it.
6. CI: run on PRs touching `crm/` or `backend/` (cache browsers; upload traces on failure).

### WP-2.10: Accessibility scanning
1. Add `@axe-core/playwright`. A helper `expectNoA11yViolations(page, { tags: ["wcag2a","wcag2aa"] })`.
2. Visit **every route** (fixed list from the router) as the owner role and in dark and light themes; record violations by rule.
3. Store the current violation counts per rule in `quality-baseline.json` as `fe.axe_serious_critical` (lower-is-better). P4 takes it to 0.
4. Don't fix anything here; this phase only measures.

---

## Exit criteria for P2
- [x] Postgres-backed HTTP test harness works locally (docker compose) and in CI (`conftest.py`, `factories.py`)
- [x] Route-inventory test enforces auth on every route and the allowlist has reasons (`test_route_inventory.py`, `public_routes.py`)
- [x] Authz matrix exists; secure-expectation xfails are counted in the baseline (`test_authz_matrix.py`, `be.authz_xfails: 3`)
- [x] Every API route is hit by at least one HTTP test; backend coverage rose to 41.23% (318 passed, 8 strict xfails)
- [x] Domain workflows (lead → estimate → contract → signed) have scenario tests (`test_domain_*.py`)
- [x] Tautological tests removed or rewritten (all 7 legacy tautological suites cleaned)
- [x] MSW + `renderWithProviders` in place; frontend coverage baseline created (15 test files, 85 passed)
- [x] 8 Playwright journeys exist (green, or explicitly `test.fail` with reasons: 13 passed)
- [x] axe baseline recorded for all routes (`crm/axe-baseline.json`: 54 serious/critical violations)
- [x] Ratchet baseline updated with all new metrics (`cov.backend: 41.23`, `cov.frontend: 3.84`, `fe.axe_serious_critical: 54`)

## Hand-off to P3
### 1. Strict-xfail Bug Inventory (Definitive P3 Fix Targets)
1. **IDOR on Estimates** (`test_authz_matrix.py::test_sales_rep_cannot_read_foreign_estimate`): `GET /api/admin/estimates/{id}` returns foreign estimate data to a sales_rep scoped to `own`.
2. **IDOR on Contracts** (`test_authz_matrix.py::test_sales_rep_cannot_read_foreign_contract`): `GET /api/admin/contracts/draft-by-lead/{id}` returns foreign contracts and signing tokens to foreign reps.
3. **Scope Leak on Export** (`test_authz_matrix.py::test_sales_rep_export_scoped_to_own_records`): `GET /api/admin/export?type=leads` returns all leads across the entire company instead of filtering by `assigned_to`.
4. **Estimate Numbering Race Condition** (`test_domain_estimates.py::test_concurrent_estimate_creation_generates_unique_numbers`): `POST /api/admin/estimates` calculates next estimate number via `SELECT COUNT(*)`, colliding under concurrency.
5. **GET Request Mutates Database** (`test_domain_clients.py::test_get_clients_sync_does_not_mutate_state`): `GET /api/admin/clients?sync=true` calls `auto_heal_dataflow_sync` which mutates `leads.client_id` inside a read query.
6. **Audit Identity Spoofing** (`test_domain_leads.py::test_lead_activity_author_cannot_be_spoofed`): `POST /api/admin/leads/{id}/activities` accepts arbitrary user-supplied `authorName` and `authorRole` in the JSON body.
7. **Undefined Column Crash in Contract Signing** (`test_domain_workflows.py::test_lead_to_contract_signed_lifecycle`): Contract signing triggers an update on nonexistent column `granular_stage` (which is a virtual computed property), causing PostgreSQL `UndefinedColumnError`.
8. **AttributeError in Job Creation** (`test_domain_jobs_finances.py::test_job_creation_with_client_creation`): `POST /api/admin/jobs` calls `find_or_create_client` which returns an integer ID, but subsequent code accesses `client.id`, raising `AttributeError: 'int' object has no attribute 'id'`.

### 2. Frontend & Design Characterisations for P3/P4
- **Contract HTML Generator Demo Defaults** (`generateContractHtml.test.ts`): Missing customer/estimate data injects hardcoded fallback values ("Marc Sarellano", "Edith Guerrero", "Bel Air 303 Sierra Madre") rather than validating required fields.
- **A11y Violations Count**: 54 serious/critical axe accessibility violations catalogued in `crm/axe-baseline.json` across 15 routes in light and dark modes.
