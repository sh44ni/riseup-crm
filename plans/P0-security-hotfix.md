# P0: Security Hotfix

**Goal:** Close every Critical finding and fix the endpoints that are broken today, without restructuring anything. This phase ships on its own and does not depend on later phases.

**Prerequisites:** None. Requires access to the VPS, the production database, and the git remote.

**Delivers toward 10/10:** removes all 4 Critical security items; backend Security 2.5 → ~5; fixes 4 functional bugs.

---

## Ground rules for this phase
- Rotate secrets **before** purging git history. A purge doesn't un-leak anything already cloned or cached.
- Each work package is its own small PR so it can be reverted independently, **except** WP-0.2 (history rewrite), which is a coordinated operation done last.
- Add a regression test for every code fix. No exceptions.
- Do not write real secret values into any file, ticket or PR. Use `<OLD_KEY>`-style placeholders.

---

## WP-0.1: Unauthenticated dashboard endpoint

**Problem:** [system.py:426](../backend/app/api/admin/system.py#L426) uses `Depends(require_auth_user)` (missing `()`), so FastAPI injects the function object and no auth runs. `GET /api/admin/dashboard` is public.

**Steps**
1. Change to `Depends(require_auth_user())`.
2. Check the handler's permission model. Decide whether the dashboard should need a permission such as `dashboard.view` rather than just login. Match the frontend route guard.
3. Search for other missed-parentheses cases: `git grep -nE "Depends\((require_auth_user|require_permission|require_auth)\)" backend/app`. Any match without `(...)` is a bug.
4. Add `tests/test_p0_security.py::test_dashboard_requires_auth`: an unauthenticated `GET /api/admin/dashboard` must return 401.

**Acceptance:** the test fails before the fix and passes after; the grep returns nothing.
**Rollback:** revert the PR (one line).

---

## WP-0.2: Rotate leaked credentials and purge history

### Part A: Inventory (do this first)
1. Run `git grep -n "rup_live_"` and classify each hit as **placeholder** (docs, `docs_notes.py`) or **real**. Known real: `seed_users.py`, `backend/scratch/test_api_send_email.py`, `test_create_estimate_api.py`, `test_generate_pdf_api.py`, `test_photo_upload.py`, `test_post.ps1`. Check `static/developer/index.html`, `app/static/developer/index.html`, `tests/test_developer.py` and `core/config.py`.
2. List **every** credential found in the repo and untracked scratch: the API key, the VPS root password (in untracked `backend/scratch/deploy_*` scripts, 10+ files), default seeded passwords, and the `KNOWN_BAD_SECRETS` values in `core/config.py` (they look like former production secrets).
3. Run a full-history scan: `gitleaks detect --source . --log-opts="--all" --report-path gitleaks-before.json` (keep the report **outside** the repo).

### Part B: Rotate (production)
1. **API key:** create a replacement key through the developer console, update every consumer (CRM frontend env, website env, any scripts) and deploy; confirm traffic works; then **revoke** the old key. Give the new key narrow scopes and real allowed origins, not `["*"]` for both.
2. **VPS:** change the root password, create a non-root deploy user, install SSH keys, set `PasswordAuthentication no` and `PermitRootLogin prohibit-password`, and verify you can still log in before closing the old session.
3. **Seeded accounts:** `seed_users.py` created 3 owner accounts with password `"access"`. Check in production whether those accounts exist; reset their passwords or deactivate them. Same for the `"RiseUp2025!"` default in `rbac.py`: query for users who may still have it, and force resets.
4. **Config secrets:** confirm the production values of `SESSION_SECRET_KEY`, `MIGRATION_KEY`, `CRON_SECRET` and any other env secrets differ from every string in `KNOWN_BAD_SECRETS`; rotate any that match.
5. Check access logs for the old key and old accounts for abuse. Record findings in the PR.

### Part C: Remove from the working tree (own PR)
1. `git rm -r --cached backend/scratch`; ensure `.gitignore` contains `backend/scratch/`.
2. Remove tracked generated PDFs: `git rm --cached backend/static/uploads/estimates/*.pdf backend/app/static/uploads/estimates/*.pdf`, and ignore `static/uploads/`.
3. Remove `backend/seed_temp.py`. Rewrite `seed_users.py` into `scripts/seed_dev.py` that reads credentials from env vars, refuses to run when `APP_ENV=production`, and has a `__main__` guard.

### Part D: Purge history (last, coordinated)
1. Create a **local, untracked** `replacements.txt` containing `<OLD_KEY>==>REDACTED` (and other leaked strings).
2. Make a fresh mirror clone, run `git filter-repo --replace-text replacements.txt --path backend/scratch --invert-paths`.
3. Re-run gitleaks over the rewritten history, expect 0 findings, then force-push all branches and tags.
4. Re-clone on every machine and on the VPS. Invalidate any CI caches. Check whether forks or other remotes exist.
5. Keep a backup of the pre-purge mirror in a private location until the new history is verified.

**Acceptance:** `gitleaks` over full history returns 0; the old key returns 401/403; old VPS password is rejected; deploy still works with the new credentials.
**Rollback:** keep the pre-purge mirror; rotated credentials are never rolled back.

---

## WP-0.3: Add `.dockerignore`

**Steps**
1. Create `backend/.dockerignore`: `.env`, `.env.*`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `scratch/`, `tests/`, `*.zip`, `static/uploads/`, `.git`, `*.md`.
2. Rebuild the image and inspect it with `docker run --rm <img> ls -la /app` and `dive <img>`: confirm no `.env`, `.venv`, scratch or zips.
3. Check whether any already-published image contains the scratch scripts. If so, delete it from the registry and treat its contents as exposed (the credentials are already rotated in WP-0.2).

**Acceptance:** the final image contains no secrets or scratch files; image size drops.

---

## WP-0.4: RBAC privilege escalation

**Problem:** [rbac.py:342-435](../backend/app/api/admin/rbac.py#L342-L435). `create_user` accepts any `role` (including `owner`) from the body and falls back to a default password. `update_user` can change role/status of any user including protected owners and wipes `user_roles` with no guard. `detail=str(e)` is returned at line 381.

**Steps**
1. Replace `body = await request.json()` with a Pydantic model (`CreateUserRequest`, `UpdateUserRequest`), `extra="forbid"`, and validate `role` against the roles table.
2. **Rule:** only an `owner` may create, promote or demote an `owner` or any `is_protected` role. Everyone else gets 403.
3. Remove the default password. New users get an invitation or reset link (reuse the existing invitations flow); if a password is supplied, enforce a minimum policy and hash it with the existing Argon2 helper.
4. In `update_user`: forbid changing role/status of a protected user unless the caller is an owner; forbid a user from changing their own role; don't wipe `user_roles` unless a new role set is provided.
5. Return generic errors (`"Could not create user"`) and log the details server-side.
6. Tests (use dependency overrides for the acting user): non-owner creating owner → 403; owner creating owner → 201; update protected user as non-owner → 403; no default-password path remains.

**Acceptance:** tests above pass; `git grep "RiseUp2025"` returns nothing.
**Rollback:** revert the PR; note this removes the guard, so only roll back if the new flow blocks legitimate use.

---

## WP-0.5: Google OAuth

**Problem:** [integrations.py:21-103](../backend/app/api/admin/integrations.py#L21-L103). `state` is the constant `"riseup_oauth_sync"`, the endpoints are unauthenticated, and URLs are built from `x-forwarded-host`/`host` headers.

**Steps**
1. Require an authenticated user with an integrations permission on `/google-auth`.
2. Generate `state = secrets.token_urlsafe(32)`, store `oauth_state:{state} → user_id` in Redis with a short TTL, include it in the auth URL.
3. In the callback, look up and **delete** the state (one-time use), reject if missing or the user doesn't match (400), and then bind the tokens to that user.
4. Build `redirect_uri` and base URL from settings (`GOOGLE_REDIRECT_URI`, `PUBLIC_BACKEND_URL`), never from request headers.
5. Tests: missing state → 400; replayed state → 400; valid state → success (mock Google's token endpoint).

**Acceptance:** CSRF-style callback with a forged state is rejected; no header-derived URLs remain.

---

## WP-0.6: Stop leaking internals in errors

**Steps**
1. [estimates.py:696](../backend/app/api/admin/estimates.py#L696): return `"PDF generation failed"` with a request ID; log the traceback.
2. [telemetry.py:94-107](../backend/app/middlewares/telemetry.py#L94-L107): don't build a 500 response with `str(exc)`; record telemetry, then **re-raise** so the global handler in `main.py` produces the response. Remove the Origin reflection with `Access-Control-Allow-Credentials`. CORS headers for errors must come from the CORS middleware only.
3. Fix `reports.py:543`, `developer.py:1101` and `developer.py:1177` the same way.
4. Search: `git grep -nE "detail=.*str\(e\)|\"error\": str\(" backend/app`. Fix each.
5. Add a test that triggers an exception and asserts the body doesn't contain the exception text or `Traceback`.

**Acceptance:** the search returns nothing; the test passes in production mode.

---

## WP-0.7: Production configuration safety

**Problem:** [config.py:101](../backend/app/core/config.py#L101) computes `ENVIRONMENT or APP_ENV`, but `ENVIRONMENT` defaults to `"development"`, so setting only `APP_ENV=production` skips the secret check. `DEBUG=True` by default; default DB password and `minioadmin` S3 keys.

**Steps**
1. Introduce a single `ENVIRONMENT` setting (accept `APP_ENV` as an alias for back-compat), default `production`-safe: `DEBUG=False`.
2. On startup, in any non-dev/test environment, **fail fast** if secrets equal known defaults or are shorter than 32 chars. Replace the `KNOWN_BAD_SECRETS` literal list with SHA-256 hashes of the known-bad values so the source doesn't contain them.
3. Make `main.py:230` and every other environment check read the same setting.
4. Tests: startup with default secrets and `ENVIRONMENT=production` raises; with `APP_ENV=production` only also raises.

**Acceptance:** misconfiguration can't silently disable production safeguards.

---

## WP-0.8: Fix endpoints that are broken today

Each fix needs a failing test first.

1. **Estimates crash.** [estimates.py:193](../backend/app/api/admin/estimates.py#L193), `:303`, `:476` call `payload.get(...)` on Pydantic models. Use attribute access (`payload.total`, `payload.status`). Check `:1583-1584`, which uses `isinstance(payload, dict)`, for the same assumption. Test: `POST /api/admin/estimates` with a valid body returns 200/201.
2. **Client never linked to the estimate.** `find_or_create_client` returns an `int` ([services/sync.py:95](../backend/app/services/sync.py#L95)), but [estimates.py:215](../backend/app/api/admin/estimates.py#L215) and `:567` read `c.id` inside `try/except: pass`. Use the int, and remove the blanket `except: pass`. Test: creating an estimate for a new client sets `client_id`.
3. **Shared session in `asyncio.gather`.** [clients.py:841-939](../backend/app/api/admin/clients.py#L841-L939). Run the queries sequentially (simplest, safe) or give each task its own session via the session factory. Test: the Client 360 endpoint returns all sections.
4. **Broken bind.** [reports.py:60](../backend/app/api/admin/reports.py#L60) `:filter_to::DATE` → `CAST(:filter_to AS DATE)`. Search for other `:name::TYPE` patterns: `git grep -nE ":[a-z_]+::" backend/app`. Test: a report with `?to=2026-01-31` doesn't error.
5. **Contract draft version.** `PUT /contracts/{id}/draft` never selects `version`, so the response always says 2. Select it and return the real value.
6. **Health check.** [main.py:258-276](../backend/app/main.py#L258-L276): `await get_redis()` on a sync function and a hard-coded `db_ok = True`. Actually ping the DB (`SELECT 1`) and Redis (`await client.ping()`), and return 503 when unhealthy.

**Acceptance:** all six regression tests pass.

---

## WP-0.9: Draft-permission and quick authorisation holes (smallest viable fixes)

These get properly solved in P3, but two are cheap and severe enough to fix now:
1. [contracts.py:766](../backend/app/api/admin/contracts.py#L766): change `require_permission("contracts.view")` to an edit permission, and reject edits once status is `sent` or later (409).
2. Remove `signing_token` from any list/draft-by-lead response unless the caller has a permission for sending contracts.
3. Make `pdf_generator` filenames unguessable (append `secrets.token_urlsafe(16)`) as a stop-gap until P3 moves PDFs to private storage.

---

## Exit criteria for P0
- [ ] `gitleaks` finds 0 secrets across full history and the working tree
- [ ] Anonymous request to `/api/admin/dashboard` → 401 (test in CI)
- [ ] Non-owner cannot create/promote an owner (test)
- [ ] OAuth state is random and single-use (test)
- [ ] No internal exception text reaches clients (test)
- [ ] Production config check cannot be bypassed (test)
- [ ] Estimate create/update, Client 360 and reports-with-`to` endpoints work (tests)
- [ ] Docker image has no secrets or scratch files
- [ ] Everything verified on staging, then deployed to production
- [ ] `plans/P0` checklist ticked, and the findings summarised in the final PR

## Hand-off to P1
Leave a short `docs/security/p0-incident-notes.md` listing what was exposed, what was rotated and any residual items (e.g. a registry image that still needs deletion).
