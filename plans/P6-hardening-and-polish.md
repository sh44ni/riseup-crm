# P6: Hardening and Polish

**Goal:** Make the system production-grade and keep it that way: a minimal, non-root container, observability and alerting, enforced performance budgets, complete documentation and runbooks, and a final independent re-audit against the 10/10 bar.

**Prerequisites:** P5 merged and deployed; all P0–P5 exit criteria met.

**Delivers toward 10/10:** DevOps → 10, remaining Architecture/Maintainability items, and the verification that every category actually reaches 10.

---

## WP-6.1: Container and deployment hardening

**Backend image**
1. Multi-stage `Dockerfile`: a builder stage (installs build tools, resolves dependencies with `uv sync --frozen --no-dev`) and a slim runtime stage (`python:3.12-slim`) that copies only the virtualenv and `app/`. No `gcc` in the final image.
2. Run as a **non-root** user (`USER app`), read-only root filesystem where possible, writable `tmp` volume only.
3. `HEALTHCHECK` hitting `/health`; `STOPSIGNAL`/graceful shutdown (uvicorn `--timeout-graceful-shutdown`).
4. Worker count from environment (`WEB_CONCURRENCY`), not hard-coded; confirm all shared state is in Redis (P3) so any count is safe.
5. Playwright/Chromium moves to a **separate PDF worker image** (arq worker) so the API image stays small and the browser sandbox can be configured properly (non-root, `seccomp` profile, or the Playwright recommended flags).
6. `.dockerignore` (from P0) verified in CI by a test that builds the image and asserts the absence of `.env`, `.venv`, `scratch`, `tests`.
7. Image scan with `trivy` set to fail on HIGH/CRITICAL with a documented, expiring allow-list.

**Compose and environments**
8. Separate `docker-compose.yml` (dev) from a production compose/stack file. Production: pinned image tags (no `:latest` for `minio`/`mc`), no published Postgres/Redis ports, no bind-mounted source, no anonymous-download bucket policy (`mc anonymous set download` removed; use presigned URLs).
9. Environment configuration documented in `docs/ops/environment.md` (every variable, default, required-in-prod flag), with a startup validation step already added in P0/P3.
10. **Release pipeline:** build → test → scan → push image → run `alembic upgrade head` as a one-off release step (never during app startup) → deploy → smoke test (`/ready` plus a scripted login and read) → automatic rollback if the smoke test fails.
11. Database backups: scheduled `pg_dump`/WAL archiving to private object storage, retention policy, encrypted. **Run a restore test** into a scratch DB and record the result.

**Acceptance:** the image is non-root, small, contains no secrets; the release runs migrations separately; a restore from backup has been demonstrated.

---

## WP-6.2: Observability

1. **Error tracking:** Sentry (or equivalent) in the API, the arq worker and the CRM. Frontend source maps uploaded during CI release (not served publicly); release/version tagging; `requestId` correlation between the frontend error and the backend log. Scrub PII (emails, phone numbers, addresses, signature data) with `before_send` rules.
2. **Frontend logger** (introduced in P4.2) forwards `error` and selected `warn` to Sentry; user context is the user id only.
3. **Structured logs** (from P3) shipped to a log store (Loki/ELK/CloudWatch or the hosting provider's logs) with retention. Standard fields: `request_id`, `user_id`, `route`, `status`, `duration_ms`.
4. **Metrics:** request rate, error rate, p50/p95/p99 latency per route group, DB pool usage, Redis latency, arq queue depth and failures, PDF render time. Use Prometheus-style metrics or the provider's APM. **Remove the fake pre-filled latency deque** in `telemetry.py` and compute real values only.
5. **Health and readiness:** `/health` (liveness) and `/ready` (DB, Redis, migration head) wired to the platform's checks.
6. **Uptime and alerting:** external uptime check on the CRM and API; alerts for error-rate spike, p95 latency regression, queue backlog, failed backups, certificate expiry. Alerts go to one channel with a documented owner.
7. **Slow-query visibility:** enable `log_min_duration_statement` and review weekly; `pg_stat_statements` on.
8. **Audit trail review:** confirm the audit log captures auth events, role changes, session revocations, exports and contract status changes with `actor_type`/`actor_id`.

**Acceptance:** a deliberately thrown error in the API and in the UI shows up in Sentry with the same `requestId` within a minute; a test alert fires and reaches the channel.

---

## WP-6.3: Performance budgets (enforced)

**Frontend**
1. Tighten `size-limit` (introduced in P1): main entry JS ≤ 200 KB gzip, each route chunk ≤ 120 KB gzip, CSS ≤ 60 KB gzip (the current CSS bundle is about 415 KB uncompressed, so check that tokenisation in P4 reduced it; investigate unused CSS if not). Fail CI on a regression.
2. Run **Lighthouse CI** against the main routes with budgets (LCP, TBT, CLS, accessibility ≥ 95) on a seeded environment.
3. Review route-level code splitting after P4 (chunks for heavy features like contract builder and charts), virtualise long lists/tables (pipeline list, clients, leads) with `@tanstack/react-virtual` where profiling shows need, and memoise only where measured.
4. Image handling: sizes/`loading="lazy"`/modern formats for uploaded and static images.

**Backend**
5. Add a load-test script (`tests/perf/locustfile.py` or `k6`) covering login, pipeline board, leads list, client 360, estimate create, report endpoints, against a dataset of about 5,000 leads and 20,000 activities (seed script).
6. Set and enforce targets: p95 < 300 ms for list/board endpoints, p95 < 800 ms for report endpoints, error rate < 0.1% at the chosen concurrency. Record the baseline and fix hot spots using `EXPLAIN (ANALYZE, BUFFERS)`: missing indexes, N+1 queries (add a test helper that counts SQL statements per request and asserts a ceiling for key endpoints).
7. Cache expensive read models in Redis with explicit invalidation (dashboard stats, reports) where measurements justify it.
8. Run the perf suite on a schedule (nightly or weekly) rather than every PR; alert on regression.

**Acceptance:** budgets are enforced in CI (frontend) and verified by the scheduled load test (backend); results are stored and graphed.

---

## WP-6.4: Documentation and developer experience

Write documentation that lets a new developer be productive without asking anyone.

1. **`README.md`** (root): what the system is, repo map, quick start (one command to run everything locally with docker compose), how to run tests and linters, how to seed data.
2. **`docs/architecture/`**
   - `overview.md` (context and container diagrams, mermaid)
   - `backend.md` (layering, directory map, the recipe for adding an endpoint end to end, error taxonomy, transactions and unit of work, domain events, background jobs)
   - `frontend.md` (feature-sliced layout, data fetching rules, state rules, UI kit usage, design tokens, a11y rules)
   - `auth.md` (from P5), `data-model.md` (ERD generated from the models, conventions for migrations: expand/contract)
3. **ADRs** in `docs/adr/` for each significant decision: layering, generated API types, cookie sessions + CSRF, Modal implementation (`dialog` vs Radix), money as `Decimal`, domain events, feature flags, single contract builder.
4. **`CONTRIBUTING.md`:** branch and PR workflow, the Definition of Done, the ratchet (how to read and lower baselines), commit conventions, pre-commit setup, how to write a characterisation test, how to add a migration safely.
5. **Runbooks** in `docs/ops/`: deploy and rollback, rotate secrets (API keys, session secret, DB password, S3 keys, Resend, Turnstile), restore from backup, handle a leaked credential, handle a failed migration, add or remove a user/role, investigate a slow endpoint, clear stuck arq jobs.
6. **API docs:** the OpenAPI schema is complete (P3); publish it (behind auth) with examples on key endpoints; changelog for breaking API changes.
7. **Security docs:** update `SECURITY.md` with the reporting process, supported versions and the threat model summary (assets, trust boundaries, main controls).
8. **Code comments/docstrings:** a docstring on every service method and non-trivial repository query describing its contract and error cases. Preserve existing meaningful comments.
9. Add a doc-lint step (markdown link checker, `markdownlint`) in CI.

**Acceptance:** a person who has never seen the repo can clone it, run the full stack, run all checks, and ship a trivial change by following only the docs (do a dry run yourself from a clean machine/VM).

---

## WP-6.5: Maintenance automation

1. Dependabot/Renovate with grouped updates and auto-merge for patch updates that pass CI.
2. Scheduled workflows: weekly full-history `gitleaks`, `pip-audit`, `npm audit`, `trivy`, CodeQL, nightly e2e and weekly load test.
3. A scheduled "quality report" job that posts the ratchet table and trend (a markdown artifact or an issue comment) so drift is visible.
4. `CODEOWNERS` and issue/PR templates finalised; release tagging and a `CHANGELOG.md` generated from conventional commits.
5. Archive/remove obsolete repo content: `antigravity-awesome-skills`, `branding2.0`, `scratch`, stray root files not needed by the product (confirm each isn't referenced), and the old `public/` Next.js leftovers if `website/` owns them. Put anything worth keeping in `docs/assets/` or an external storage location.

---

## WP-6.6: Final independent re-audit

Re-run the original audit method and score against the 10/10 criteria in `plans/README.md`.

1. **Automated evidence** (all must be green and recorded in `docs/audit/final-report.md`):
   - Backend: `ruff` (empty baseline), `mypy` strict, `lint-imports`, `bandit`, `pip-audit`, `pytest` with coverage ≥85%/75%, `alembic check`, route-inventory and authz matrix, `trivy`
   - Frontend: `tsc` (all strict flags), ESLint with 0 warnings, `knip` clean, `vitest` coverage ≥80% on `entities/` and `features/`, Playwright journeys, axe 0 serious/critical, Lighthouse budgets, `size-limit`
   - Repo: `gitleaks` full history clean, branch protection on, CI green
2. **Ratchet table:** every metric at its 10/10 target (see the README bar).
3. **Manual review** by reading the code, not only running tools, using the original audit's categories. Sample at least 5 handlers/components per domain and check: single responsibility, naming, error handling, no duplicated logic, docstrings/comments, tests present for the behaviour.
4. **Security pass:** a focused review of authz (try IDOR on every by-id route with a low-privilege user), auth/session/CSRF, uploads, PDF/SSRF, headers/CSP, secrets, dependency risk, and the public endpoints (rate limits, Turnstile fail-closed).
5. **Score each category** using the same 10-point scale and the criteria tables. Any category below 10 becomes an explicit remediation item with an owner; fix, re-verify, and update the report. Don't round up.
6. **Chaos/failure checks:** stop Redis (auth and rate limiting fail closed in prod), stop the DB (readiness fails, clean 503s), kill a worker mid-PDF (job retries, no leaked Chromium), simulate an email-provider outage (retries and surfaced errors, no 500 storms), restore a backup.
7. Publish `docs/audit/final-report.md` with scores, evidence links and any residual accepted risks (each with a rationale and a review date).

---

## Exit criteria for P6 (and for the whole programme)
- [ ] Non-root slim image, healthcheck, separate PDF worker; migrations run as a release step
- [ ] Backups automated; a restore test has been performed and recorded
- [ ] Error tracking, structured logs, metrics and alerts live; fake telemetry removed
- [ ] Frontend budgets enforced in CI; backend p95 targets verified by the load test
- [ ] Documentation set complete and validated by a clean-machine dry run
- [ ] Maintenance automation scheduled (security scans, dependency updates, nightly e2e, quality report)
- [ ] Final re-audit completed: **every category scores 10/10** against the written criteria, evidence recorded in `docs/audit/final-report.md`
- [ ] Residual risks (if any) documented, justified and dated

## After the programme
The ratchet and the scheduled jobs keep the score from decaying. Treat any red ratchet or failing scheduled check as a defect, not a chore.
