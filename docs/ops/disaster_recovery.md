# Runbook: Disaster Recovery & Database Restoration

## 1. Backup Architecture
- **Full Database Dumps:** Scheduled daily at 02:00 UTC using `pg_dump` with gzip compression and AES-256 encryption.
- **WAL Archiving:** Continuous write-ahead log shipping to private S3 bucket (`s3://riseup-backups/wal/`).
- **Retention Policy:**
  - Daily backups: Retained for 30 days.
  - Weekly backups: Retained for 12 weeks.
  - Monthly archives: Retained for 1 year.

---

## 2. Restoration Verification Procedure
Restorations must be verified periodically using the automated test harness:
```bash
python backend/scripts/backup_restore_test.py
```
This script:
1. Snapshots active row counts in core production tables.
2. Restores records into an isolated scratch schema.
3. Asserts 100% data fidelity and row count parity.
4. Cleans up scratch schema upon completion.

---

## 3. Emergency Disaster Restoration Steps

### Step 1: Provision Clean Database Target
If primary database hardware or storage is corrupted:
```bash
# Provision new PostgreSQL container or cloud instance
docker compose -f backend/docker-compose.prod.yml up -d postgres
```

### Step 2: Fetch and Decrypt Latest Backup
```bash
# Download backup archive from private S3 bucket
aws s3 cp s3://riseup-backups/daily/riseup_db_latest.dump.gpg ./

# Decrypt backup archive with recovery key
gpg --decrypt --output riseup_db_latest.dump riseup_db_latest.dump.gpg
```

### Step 3: Execute Database Restore
```bash
# Restore schema and data into PostgreSQL
pg_restore -U riseup_admin -d riseup_production -v riseup_db_latest.dump
```

### Step 4: Verify Schema Migrations & Readiness
```bash
cd backend
alembic upgrade head

curl -f http://localhost:8000/ready
# Assert: {"status": "ready", "ready": true, "database": "connected", "migrations": "applied"}
```
