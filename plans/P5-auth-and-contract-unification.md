# P5: Auth and Contract Unification

**Goal:** Remove the auth token from JavaScript-readable storage by moving to httpOnly cookie sessions with CSRF protection, give API keys their own principal type so they can never collide with user IDs, set a strict CSP and security headers, and unify the public/auth route configuration.

**Prerequisites:** P3 and P4 exit criteria met. Frontend access to the token and user object is isolated in `AuthContext` and the API client (P4 hand-off).

**Delivers toward 10/10:** Frontend Security 6 → 10, Backend Security (session and principal model), remaining auth-related items in Architecture.

> **Assumption:** the CRM and API share a registrable parent domain (for example `crm.riseuprac.com` and `backend.riseuprac.com`), so a `SameSite=Lax` cookie scoped to the parent domain (or the proxied same-origin `/api`) works. **Verify the real production and staging hostnames first** (WP-5.1). If they differ, use the same-origin proxy approach described there.

---

## WP-5.1: Pre-flight verification and decision record

1. List every production, staging and preview hostname (CRM, API, website, Vercel previews) and how the CRM reaches the API today (proxied `/api` vs absolute origin; see `api.ts` host sniffing, now removed in P4.1).
2. Choose the cookie topology and write it as an ADR (`docs/adr/00X-cookie-sessions.md`):
   - **Preferred:** same-origin `/api` through the CRM host's reverse proxy; cookie `Host-` prefixed, no `Domain` attribute.
   - **Alternative:** parent-domain cookie `Domain=.riseuprac.com; SameSite=Lax; Secure; HttpOnly`.
3. Note the **website** (Next.js) and any third-party callers: they continue to use API keys and are unaffected.
4. Decide session lifetime (idle timeout, absolute timeout) and the "remember me" behaviour.

**Acceptance:** an ADR records the topology, cookie attributes and lifetimes.

---

## WP-5.2: Backend cookie sessions

1. **Login:** `POST /api/admin/auth/login` validates credentials as today, creates the session (token already hashed at rest from P3), and sets:
   `Set-Cookie: __Host-session=<opaque>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=…`
   (If a parent-domain cookie is chosen, `__Host-` can't be used; use `__Secure-` plus `Domain`.) Stop returning the token in the response body once the frontend has switched (keep it behind a temporary `LEGACY_BEARER_AUTH` setting during rollout).
2. **Authentication resolution** order in the middleware/dependency: session cookie → (temporary) `Authorization: Bearer` → API key header for service callers. One function builds the `Principal` (from P3).
3. **Logout:** delete the session server-side and clear the cookie (`Max-Age=0`).
4. **Sliding expiry** with an absolute cap; rotate the session identifier on login and on privilege change (role change forces re-auth or rotation).
5. **Session management endpoints:** list own sessions (device, last seen, IP), revoke one, revoke all other sessions. This also backs the "Security & Backups" settings tab that currently shows fake sessions.
6. **`GET /api/admin/auth/me`** returns the user, permissions, scopes and enabled features (flags from P4.10) with `Cache-Control: no-store`. The frontend stops caching the user in localStorage.

**Acceptance:** tests for login (cookie attributes present), logout (cookie cleared and server session deleted), expired session → 401, rotated ID on login, revoked session rejected immediately across workers (Redis authority from P3).

---

## WP-5.3: CSRF protection

1. **Double-submit cookie with signed token:** on login (and on `GET /me`), set a non-HttpOnly `csrf_token` cookie (or return it in the `/me` payload); the client sends it as `X-CSRF-Token` on every unsafe method (`POST/PUT/PATCH/DELETE`). The backend verifies the header matches a token derived from the session (HMAC of the session id), using `hmac.compare_digest`.
2. Enforce in one middleware/dependency applied to every cookie-authenticated unsafe request. Requests authenticated **only** by API key or Bearer don't need CSRF and are exempt.
3. Also check `Origin`/`Referer` against the allowed origin list for unsafe methods (defence in depth).
4. Make the public signing and public form endpoints explicitly not use cookie auth (they use signing tokens/Turnstile) and keep them out of the CSRF scope.
5. Tests: a cookie-authenticated `POST` without a CSRF header → 403; with the wrong token → 403; with a valid token → success; API-key `POST` unaffected.

---

## WP-5.4: Frontend switch to cookie auth

1. In `shared/api/client.ts` (the only HTTP path after P4): `credentials: "include"`; attach `X-CSRF-Token` for unsafe methods; remove the `Authorization` header logic.
2. In `AuthContext`: replace localStorage hydration with `useQuery(['me'])` against `/auth/me`; unauthenticated state comes from a 401 on `/me`. Remove **all** reads/writes of `crm_auth_token` and `crm_user` (`api.ts:39,47`, `AuthContext.tsx:68,106,114,133`). Add a one-time cleanup that deletes the old keys from existing browsers.
3. Permission checks (`PermissionRoute`, `hasPermission`, `getScope`) read from the `/me` query. Add a loading state so guards wait for hydration instead of trusting cached data (fixes the pre-hydration trust noted in the audit).
4. Fix the guard gaps from the audit: `/marketing` should require its own permission (not `reports.view`), and the dashboard index route should have an explicit permission check.
5. Keep the 401 handler (one place) that clears the query cache and redirects to login with a loop guard.
6. ESLint: forbid `localStorage`/`sessionStorage` use except through the typed UI-prefs hook.
7. Update MSW handlers/e2e login helpers (Playwright `storageState` now holds cookies).

**Acceptance:** `grep -r "crm_auth_token" crm/src` returns nothing; in DevTools → Application → Local Storage there is no token; e2e journeys pass.

---

## WP-5.5: Principal separation for API keys

1. Ensure `Principal.kind` (`"user"` | `"api_key"`) exists everywhere (introduced in P3). An API-key principal has `id = "key:<id>"` (string) or a separate `key_id` field with `user_id = None`, so no code path can treat key #3 as user #3.
2. Audit every use of `user.id` for writes (`created_by`, `performed_by`, `assigned_to`) and make them handle `kind == "api_key"`: record `actor_type` and `actor_id` separately in `activities` and audit tables (migration: add `actor_type`, default `'user'`).
3. `check_resource_access`/`ensure_owns`: API keys are evaluated by their **scopes** only, never by ownership.
4. Narrow API-key scopes to what the website and any integrations actually call (public form, estimator, tracking), replacing the full-access `["*"]` key; enforce per-key allowed origins and rate limits.
5. Add tests: an API key with id equal to a real user id cannot read that user's "own" resources.

---

## WP-5.6: CSP, security headers and CORS tightening

1. **Backend (API) headers middleware:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (disable camera/mic/geolocation unless needed), `Cache-Control: no-store` on authenticated JSON.
2. **CRM host headers** (via the hosting/proxy config, e.g. `vercel.json` or the reverse proxy):
   - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (tighten to nonces/hashes if feasible with Tailwind output); `img-src 'self' data: blob: <storage-host>`; `font-src 'self'`; `connect-src 'self' <api-host>`; `frame-src 'self' blob:`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'`.
   - Roll out with `Content-Security-Policy-Report-Only` first, collect violations (report endpoint or Sentry), fix, then enforce.
3. **CORS:** with same-origin cookie auth, the allow-list for credentialed CORS is exactly the CRM origin(s); no wildcard, no localhost regex in production (done in P3; verify).
4. Third-party scripts (weather, fonts, Turnstile on the website) are reviewed against the CSP and self-hosted or allow-listed explicitly.
5. Add a Playwright test asserting the main security headers on the CRM and API responses, and no CSP violations in the console during the e2e journeys.

---

## WP-5.7: Unify public route configuration

1. Backend: a single `PUBLIC_ROUTES` declaration (used by auth middleware, route-inventory test from P2, and CSRF exemptions).
2. Expose the frontend-relevant public paths (login, accept-invite, contract signing) from one constant in `shared/api`, generated or imported from a shared list, replacing the duplicates in `api.ts:104-116` and `AuthContext.tsx:86`.
3. A test ensures the lists agree (backend OpenAPI tags vs frontend constants).

---

## WP-5.8: Rollout plan (zero lockout)

Sequence matters. Each step is a separate deploy with verification.
1. **Deploy backend with both mechanisms:** cookie issued on login **and** token still returned; middleware accepts either. CSRF enforced only for cookie-authenticated requests.
2. **Deploy frontend** that uses cookies only. Verify on staging with real roles; then production.
3. **Observe:** a metric/log of Bearer-authenticated browser requests should trend to zero.
4. **Disable legacy Bearer** (`LEGACY_BEARER_AUTH=false`) and stop returning the token in the login response; keep API-key auth.
5. **Revoke all old sessions** once to force a clean login for everyone; announce to the team before doing so.
6. **Rollback:** re-enable `LEGACY_BEARER_AUTH` and redeploy the previous frontend build; both are config/deploy-level, no migration.

---

## Exit criteria for P5
- [ ] No auth token or user object in `localStorage`/`sessionStorage`; `grep` is clean
- [ ] Cookie attributes verified (`HttpOnly; Secure; SameSite`), CSRF enforced and tested
- [ ] Session list/revoke endpoints and UI work; sessions revoke immediately across workers
- [ ] API keys use a separate principal kind; audit tables record `actor_type`
- [ ] CSP enforced (after Report-Only soak) with no violations in e2e; security-header test passes
- [ ] One public-route list shared by backend, route-inventory test and frontend
- [ ] Legacy Bearer path disabled and removed after rollout
- [ ] ADR(s) recorded for cookie topology and CSRF design

## Hand-off to P6
Document the final auth flow in `docs/architecture/auth.md` (login, refresh/expiry, CSRF, API keys, rollout/rollback levers) for use in the P6 documentation set.
