# Security Policy & Vulnerability Reporting

## 1. Supported Versions

| Component | Supported Version | Security Support Status |
| :--- | :--- | :--- |
| **Backend API** | `>= 3.1.0` | Active Security Maintenance |
| **CRM Backoffice**| `>= 3.1.0` | Active Security Maintenance |
| **Website** | `>= 2.0.0` | Active Security Maintenance |
| `< 3.0.0` | Any | End of Life (Unsupported) |

---

## 2. Reporting a Vulnerability

The Rise Up Roofing security team takes platform security seriously. If you identify a security issue, vulnerability, or potential exploit, please report it responsibly:

- **Primary Contact:** `security@riseuprac.com` or `info@riseuprac.com`
- **Response Window:** Initial triage response within 24 hours.
- **Remediation SLA:** High and Critical vulnerabilities remediated within 72 hours.
- **Responsible Disclosure:** Please do not publicly disclose, post on forums, or open public GitHub issues until a verified patch has been deployed.

---

## 3. Threat Model Summary

### 3.1 Core Assets Protected
1. **Customer Records & PII:** Names, addresses, contact details, roof inspection data, and insurance paperwork.
2. **Contract Signatures & Legal Artifacts:** Legally binding contract terms, customer signatures, and payment schedules.
3. **Financial Records & Margins:** Job margins, invoice ledgers, company revenue, and pricing formulas.
4. **Staff Credentials & Sessions:** Admin session tokens, API keys, and RBAC privilege maps.

### 3.2 Trust Boundaries
- **Public Client Boundary:** Web browsers and public users. All inputs are sanitized, validated against strict Pydantic / Zod models, and rate-limited.
- **Service Authentication Boundary:** Requests authenticated via signed HMAC-SHA256 CSRF tokens and HttpOnly session cookies.
- **Principal Isolation Boundary:** API keys have `kind: "api_key"` and cannot claim human record ownership in `check_resource_access` or `ensure_owns`, preventing IDOR exploits.
- **Network Isolation Boundary:** PostgreSQL and Redis databases reside on internal Docker networks with no exposed host ports in production.

### 3.3 Main Security Controls
- **XSS Defense:** HttpOnly cookies for session storage; no secrets in `localStorage`; HTML escaping in proposal/contract generators.
- **CSRF Defense:** Double-submit cookie with HMAC-SHA256 signed `X-CSRF-Token` headers verified on all mutating requests.
- **MIME & Frame Defense:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- **Content Security Policy:** Strict CSP preventing inline script execution, object embedding, and unauthorized origins.
- **Audit Logging:** Every mutating administrative action is recorded with `actor_type`, `actor_id`, client IP, user agent, and timestamp.
