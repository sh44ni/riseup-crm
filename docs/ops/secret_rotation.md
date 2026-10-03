# Runbook: Secret & Credential Rotation Procedures

This guide details step-by-step procedures for rotating credentials across all Rise Up Roofing environments.

## 1. Session Secret Key (`SESSION_SECRET_KEY`)
Used for HMAC-SHA256 CSRF token generation and session integrity.

### Rotation Steps:
1. Generate a new high-entropy 64-character secret:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. Update `SESSION_SECRET_KEY` in environment config (`.env` or secret manager).
3. Restart FastAPI web containers.
4. **Impact:** Users with active browser sessions will have their CSRF tokens invalidated and will be prompted to log in again. Schedule rotation during off-peak hours.

---

## 2. Database Password (`DATABASE_URL` & `POSTGRES_PASSWORD`)

### Rotation Steps:
1. Connect to PostgreSQL as superuser:
   ```sql
   ALTER USER riseup_admin WITH PASSWORD 'NewStrongPasswordHere!';
   ```
2. Update `DATABASE_URL` and `POSTGRES_PASSWORD` in the environment.
3. Perform a zero-downtime rolling restart of backend API and ARQ worker containers.
4. Verify `/ready` returns `database: connected`.

---

## 3. Redis Password (`REDIS_URL` & `REDIS_PASSWORD`)

### Rotation Steps:
1. Update `requirepass` in Redis config or execute via `redis-cli`:
   ```bash
   redis-cli -a CurrentPassword CONFIG SET requirepass "NewStrongPasswordHere!"
   ```
2. Update `REDIS_URL` and `REDIS_PASSWORD` in environment config.
3. Restart API and ARQ worker containers.
4. Verify `/ready` returns `redis: connected`.

---

## 4. API Keys & Webhook Secrets (`CRON_SECRET`, `MIGRATION_KEY`)

1. Generate new 32+ character hex tokens:
   ```bash
   python -c "import secrets; print(secrets.token_hex(16))"
   ```
2. Update cron runner headers or secret configurations.
3. Deploy new environment variables to backend.

---

## 5. Leaked Credential Emergency Protocol
If any credential or key is accidentally committed or exposed:
1. **Immediately revoke** the key at the provider (Cloudflare, Resend, S3/AWS, Google, Yelp).
2. Generate a replacement key and update production environment variables.
3. Trigger application restart.
4. Run `gitleaks` to confirm repository history is clean.
5. Record incident in security audit log.
