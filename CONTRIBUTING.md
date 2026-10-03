# Contributing to Rise Up Roofing & CRM

Welcome to the Rise Up Roofing platform. This document outlines development practices, workflows, quality gates, and the Definition of Done.

---

## 1. Development Setup

### 1.1 Prerequisites
- **Git** with pre-commit hooks
- **Python 3.12+** with `uv` or virtualenv
- **Node.js 20+** and npm 10+
- **Docker** and Docker Compose

### 1.2 One-Time Setup
```bash
# 1. Install pre-commit hooks from repository root
pip install pre-commit
pre-commit install

# 2. Setup backend virtual environment
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 3. Setup frontend dependencies
cd ../crm
npm install
```

---

## 2. Branch & PR Workflow

1. **Branch Naming Conventions:**
   - Feature: `feat/<domain>-<short-description>` (e.g. `feat/leads-sms-alert`)
   - Bugfix: `fix/<issue-description>` (e.g. `fix/csrf-origin-check`)
   - Refactor: `refactor/<target>` (e.g. `refactor/pipeline-virtualization`)
2. **Commit Message Format (Conventional Commits):**
   - Format: `<type>(<scope>): <summary>`
   - Allowed types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`.
   - Example: `fix(auth): require valid csrf token on mutating cookie requests`

---

## 3. The Quality Ratchet (`scripts/quality_ratchet.py`)

The repository enforces a strict, non-regressing quality ratchet.
- `quality-baseline.json` defines acceptable ceilings for code complexity, untyped `any`, file lengths, and raw fetches.
- **Rule:** A pull request may improve a metric, but **never** worsen it.
- **Commands:**
  ```bash
  # Check if your branch regressed any quality metric
  python scripts/quality_ratchet.py

  # Update the baseline downwards when your work improved a metric
  python scripts/quality_ratchet.py --update
  ```

---

## 4. Testing & Verification Requirements

### 4.1 Running Tests
```bash
# Backend pytest suite (all 350+ tests must pass)
cd backend
pytest tests/ -v

# Performance load budget verification
pytest tests/perf/ -v

# Frontend Vitest suite (all 92+ tests must pass)
cd ../crm
npm test -- --run

# TypeScript compilation check (0 errors required)
npx tsc -b
```

### 4.2 Writing Characterization Tests
Before refactoring legacy code:
1. Write an integration test asserting existing observed behavior across success and error conditions.
2. Run the test to confirm it passes on the baseline code.
3. Perform the refactoring.
4. Confirm the characterization test still passes without modification.

### 4.3 Adding Safe Database Migrations
Migrations must follow the **Expand / Contract** zero-downtime pattern:
1. Generate migration:
   ```bash
   cd backend
   alembic revision -m "add_column_name"
   ```
2. Columns must be nullable or provide safe database defaults.
3. Always implement both `upgrade()` and `downgrade()` routines.
4. Verify migration against the test database:
   ```bash
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```

---

## 5. Definition of Done (DoD)

A pull request is ready to merge only when:
- [ ] 100% test pass rate across backend and frontend suites.
- [ ] Zero TypeScript compilation errors (`npx tsc -b`).
- [ ] Zero lint errors and no untyped `: any` introduced.
- [ ] Quality ratchet passes (`python scripts/quality_ratchet.py`).
- [ ] Endpoints decorated with explicit `response_model` and permissions dependency.
- [ ] No secrets committed (verified by `gitleaks`).
- [ ] Architectural decisions documented in `docs/decisions/` (ADR) if significant.
