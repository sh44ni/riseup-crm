# P0 Security Hotfix — Incident Notes & Hand-off to P1

Status: **code changes complete on the working tree; manual/ops items below are still open.**
No secret values are recorded in this document. Never add any.

## 1. What was exposed

| Item | Where | Status |
| --- | --- | --- |
| A `rup_live_…` CRM API key (wildcard scopes and origins) | `backend/seed_users.py`, `backend/scratch/*`, website fallbacks (`website/lib/reviews-server.ts`, `website/app/api/estimator/config/route.ts`) and **git history** | Removed from the working tree. **Still in history and must be rotated.** |
| VPS root password | untracked `backend/scratch/deploy_*` scripts (local disk and potentially any image built from `backend/`) | **Rotate.** |
| Three seeded owner accounts sharing a trivial password | `backend/seed_users.py` | Script removed. **Accounts must be reset or deactivated.** |
| Default password for admin-created users | `rbac.py` `create_user` | Removed. Users without a password are invited. |
| Former production secrets used as `KNOWN_BAD_SECRETS` defaults | `core/config.py` | Plaintext removed and replaced by SHA-256 hashes. **Rotate if still in use.** |
| `backend/` image contents | `Dockerfile` `COPY . .` without `.dockerignore` | `.dockerignore` added. Existing images need to be checked. |

## 2. Code changes (by work package)

- **WP-0.1** `/api/admin/dashboard` requires authentication (`Depends(require_auth_user())` was missing its parentheses).
- **WP-0.2** The API key fallback is removed from the website. `seed_users.py` and `seed_temp.py` are deleted. `scratch/` is untracked. Estimate PDFs and uploads are untracked and ignored. A safe `backend/scripts/seed_dev.py` replaces the old seeder. It is dev-only, takes its credentials from the environment, and creates no API key.
- **WP-0.3** `backend/.dockerignore` excludes `.env*`, `scratch/`, `tests/`, venvs, PDFs, zips and uploads.
- **WP-0.4** The user and invitation endpoints can no longer be used for privilege escalation:
  - Pydantic models with `extra="forbid"` and a 12-character password minimum.
  - A role must exist.
  - Only owners can grant or modify protected roles.
  - No self role change.
  - The last owner cannot be demoted.
  - `contracts.edit` is part of the contract module permissions.
- **WP-0.5** Google OAuth: connecting needs `reviews:manage`. The state is random, single-use, bound to the user and expires after 10 minutes. The redirect URI comes from configuration, not request headers. Exception text is not reflected in redirects.
- **WP-0.6** Error handling:
  - Unhandled errors return a generic message plus `request_id`.
  - Details are only shown when `DEBUG` is on in a dev-like environment.
  - Origin is no longer reflected on 500s.
  - The 422 handler exposes only `loc`, `msg` and `type`.
  - `str(exc)` is no longer returned from the estimate, report, contract, developer and system endpoints. It is logged server-side instead.
- **WP-0.7** Config:
  - `DEBUG` defaults to off.
  - `ENVIRONMENT` and `APP_ENV` collapse to one value, and the non-dev one wins.
  - Outside dev, `SESSION_SECRET_KEY`, `MIGRATION_KEY` and `CRON_SECRET` must be at least 32 characters and not on the known-bad list.
- **WP-0.8** Correctness fixes:
  - Estimate create and update read pydantic fields directly.
  - `find_or_create_client` is used as an int.
  - Client 360 queries are serialised on the session.
  - The report `to` filter uses `CAST`.
  - Contract autosave uses `UPDATE … RETURNING version`.
  - `/health` and `/` really check the DB and Redis and return 503 when either is down.
- **WP-0.9** Contracts and files:
  - Autosave needs `contracts.edit` and only works while the contract is a draft or action_required.
  - `draft-by-lead` hides `signing_token` without `contracts.edit`.
  - Estimate PDF filenames have an unguessable suffix.
  - New `contracts.edit` permission. It was backfilled to every role that already has `contracts.view` the first time it is seeded.

Regression tests: `backend/tests/test_p0_security.py` and `backend/tests/test_p0_security_more.py`.

## 3. Residual manual items (not done in code)

1. Rotate the exposed CRM API key. Issue a new key with narrow scopes and allowed origins, set it as `RISEUP_API_KEY` on the website, then revoke the old key.
2. Change the VPS root password, create a non-root deploy user, and allow SSH keys only.
3. Reset or deactivate the seeded owner accounts, and any account still on the old default password. Force password changes through an invitation.
4. Check that production secrets differ from the known-bad values and are at least 32 characters.
5. Run `gitleaks` before and after the history rewrite.
6. Purge history (`git filter-repo`) of `backend/scratch/`, `seed_users.py`, `seed_temp.py` and the API key. Force-push, then re-clone everywhere.
7. Delete any published container image built from `backend/` that may contain `scratch/` or `.env`. Rebuild and inspect the new image.
8. Set `PUBLIC_BACKEND_URL` or `GOOGLE_REDIRECT_URI` and register the same callback URL in Google Cloud. The Google connect flow fails without it.
9. Deploy to staging and run the P0 checklist there before production.

## 4. Behaviour changes to be aware of

- `/health` returns **503** (`status: "unhealthy"`) when the DB or Redis is unreachable. Check any external uptime monitor.
- The Google OAuth callback redirects to `CRM_FRONTEND_URL/admin/reviews`.
- Any non-dev environment now fails fast on weak secrets, including when only `APP_ENV` is set.

## 5. Open items for P1 and later

- `contract_pdf_generator.save_contract_pdf` still writes predictable filenames.
- `_get_base_url(request)` in `admin/contracts.py` builds signing links from request headers (host-header risk).
- There is no startup check for the default DB password or `minioadmin` S3 keys. Adding one needs a prod-config review first.
- `services/email_service.py`, `reviews.py` and the background tasks still return `str(e)` internally. These are not exposed over HTTP today.
- `test_phase3_schemas_compliance.py::test_marketing_router_mount` fails and was failing before P0. The router is mounted at `/api/admin/marketing`, but the test expects `/api/admin/analytics`.
- Tracked customer photos under `backend/app/static/uploads/` were untracked. They stay in history until the purge.
