# ADR-002: HttpOnly Cookie Sessions and CSRF Protection

## Status
Accepted

## Context
Prior to Phase 5, the CRM frontend stored the administrative authentication token (`crm_auth_token`) and user object (`crm_user`) in browser `localStorage`. While convenient, storing credentials in JavaScript-accessible storage exposes them to potential exfiltration via Cross-Site Scripting (XSS) or malicious third-party dependencies.

To achieve top-tier enterprise security standards:
1. Authentication credentials must be inaccessible to JavaScript via `HttpOnly` session cookies.
2. Cross-Site Request Forgery (CSRF) must be mitigated with double-submit signed HMAC tokens and origin validation.
3. API keys must have a distinct principal model separate from human users.
4. The migration must support a zero-lockout deployment window with backward compatibility.

## Decision

### 1. Cookie Topology
- **Development Topology**: The CRM Vite development server proxies `/api` and `/static` to the FastAPI backend (`http://127.0.0.1:8000`). Consequently, requests from the frontend are same-origin (`/api/...`).
- **Production Topology**: The production frontend (`https://crm.riseuprac.com`) and backend API (`https://backend.riseuprac.com` or proxied `/api`) share the apex domain (`riseuprac.com`) or operate via same-origin reverse proxy.
- **Cookie Name**:
  - In HTTPS environments: `__Host-session` (or `admin_session` when configured with apex domain delegation).
  - In HTTP local development: `session` or `admin_session` (browsers reject `__Host-` prefixed cookies over unencrypted HTTP).
- **Cookie Attributes**:
  - `Path=/`
  - `HttpOnly=True`
  - `Secure=True` (when request is HTTPS or `ENVIRONMENT=production`)
  - `SameSite=Lax`
  - `Max-Age=86400` (24 hours default, sliding expiry)

### 2. Authentication Resolution Hierarchy
Incoming requests resolve the principal in the following order:
1. **Session Cookie**: `__Host-session`, `session`, or configured `COOKIE_NAME`.
2. **Bearer Token (Legacy fallback)**: `Authorization: Bearer <token>` for zero-lockout rollout.
3. **API Key**: `X-API-Key` or `X-Client-Key` for service accounts, webhooks, and public website forms.

### 3. CSRF Protection Architecture
- **Derivation**: The CSRF token is cryptographically bound to the user session via HMAC-SHA256:
  `HMAC_SHA256(secret_key, session_token)`
- **Issuance**: Provided in the response body of `POST /api/admin/auth/login` and `GET /api/admin/auth/me`, and set as a readable (non-HttpOnly) `csrf_token` cookie.
- **Transmission**: The client transmits the token via the `X-CSRF-Token` HTTP header on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Verification**: Validated using constant-time comparison (`hmac.compare_digest`).
- **Exemptions**:
  - Safe methods: `GET`, `HEAD`, `OPTIONS`.
  - Service-authenticated requests: API keys (`X-API-Key` or `Authorization: Bearer rup_...`).
  - Public unauthenticated endpoints: Public contact/estimate form submission, Turnstile validation, contract signing webhook/tokens.
- **Defense in Depth**: Unsafe requests check the `Origin` or `Referer` header against allowed CORS origins.

### 4. Session Management & Revocation
- Sessions are stored in the PostgreSQL database (`admin_sessions` table) and cached in Redis for fast sub-millisecond validation.
- Endpoints:
  - `GET /api/admin/auth/sessions`: List active sessions for the current user (IP, user agent, last seen).
  - `DELETE /api/admin/auth/sessions/{id}`: Revoke a specific session.
  - `DELETE /api/admin/auth/sessions`: Revoke all other sessions for the user.
- Explicit logout destroys the session in PostgreSQL and Redis and sets `Max-Age=0` on the cookie.

### 5. Principal Separation
- Principals are strictly separated by `kind`: `"user"` vs `"api_key"`.
- API keys have string identifiers (`key:<id>`) and `user_id = None`.
- Ownership checks (`ensure_owns`) reject API keys claiming user-scoped ownership; API keys are governed solely by granular permission scopes.

## Consequences
- JavaScript running in the browser can no longer read or exfiltrate session credentials.
- All mutating API calls from the browser require CSRF token validation.
- Rollout is zero-downtime: existing sessions continue working via Bearer token until migration is finalized and `LEGACY_BEARER_AUTH` is disabled.
