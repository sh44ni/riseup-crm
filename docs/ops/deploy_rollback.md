# Runbook: Deployment & Emergency Rollback Procedure

## 1. Release Pipeline Overview
The production release process follows a strictly verified sequence:
1. **CI Verification:** All unit, integration, and performance tests pass; `quality_ratchet.py` confirms 0 regressions; TypeScript compilation has 0 errors.
2. **Container Build & Scan:** Build multi-stage images with Trivy security scanning.
3. **Database Migration Phase (Pre-deploy):** Execute `alembic upgrade head` as a one-off job before updating application containers.
4. **Traffic Shift:** Deploy new container tasks (rolling replacement).
5. **Post-deploy Health & Smoke Verification:** Query `/ready` endpoint and perform automated synthetic test login.

---

## 2. Standard Deployment Steps

```bash
# 1. Pull latest verified release tag
git fetch --tags
git checkout tags/v3.2.0

# 2. Execute database migration
cd backend
alembic upgrade head

# 3. Build & launch production containers
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 4. Verify deployment readiness
curl -f http://localhost:8000/ready
# Expected: {"status": "ready", "ready": true, "database": "connected", "redis": "connected", "migrations": "applied"}
```

---

## 3. Emergency Rollback Procedures

### Scenario A: Application Bug or Performance Regression
If the new code produces unexpected errors or high latency:
1. Immediately redeploy the previous Docker image tag or checkout the previous stable git commit.
2. Restart application containers:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps api worker
   ```
3. Verify `/ready` returns 200 OK.

### Scenario B: Failed Database Migration
If `alembic upgrade head` encounters an error during deployment:
1. Review the migration error log.
2. Revert the applied migration step:
   ```bash
   cd backend
   alembic downgrade -1
   ```
3. Restore from the pre-deploy database snapshot if data inconsistency occurred (see [Disaster Recovery](disaster_recovery.md)).

### Scenario C: Authentication Lockout Rollback
If users experience cookie session transmission issues:
1. Enable `LEGACY_BEARER_AUTH=true` in `.env` without rolling back the codebase.
2. Restart API workers:
   ```bash
   docker compose -f docker-compose.prod.yml restart api
   ```
