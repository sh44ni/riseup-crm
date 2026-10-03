# P1: Foundations and Quality Gates

**Goal:** Make CI trustworthy and make quality **ratchet-only**, so nothing built in later phases can regress. No product behaviour changes in this phase.

**Prerequisites:** P0 merged and deployed.

**Delivers toward 10/10:** DevOps 2 → ~6, Frontend Testing/Tooling 1.5 → ~4, plus the enforcement mechanism for every later metric.

---

## WP-1.1: Reproducible backend environment

**Steps**
1. Create `backend/pyproject.toml` with `[project]` (runtime dependencies) and `[dependency-groups] dev` (pytest, pytest-asyncio, pytest-cov, pytest-xdist, ruff, mypy, import-linter, httpx, factory-boy, syrupy, pip-audit, bandit).
2. Pin everything: replace `aioboto3>=`, `ruff>=`, `pytest-cov>=`, `tzdata>=` with exact versions (resolve them with `uv lock`).
3. Generate `uv.lock` and commit it. Verify with `uv sync --frozen` in a clean checkout.
4. Keep `requirements.txt` generated only: `uv export --no-dev --frozen -o requirements.txt`, so the Dockerfile keeps working. Add a CI check that it's in sync.
5. Remove test and lint tools from the production dependency list.
6. Add a `Makefile` (or `justfile`) with `lint`, `format`, `typecheck`, `test`, `ci` targets, so local and CI commands are identical.

**Acceptance:** a fresh clone → `uv sync --frozen && make ci` works; no unpinned versions remain.

---

## WP-1.2: Backend linting with a baseline

**Steps**
1. Configure Ruff in `pyproject.toml`: target `py312`, line length 100, `select = ["E","F","I","B","UP","S","BLE","ASYNC","C90","PLR","SIM","RET","PT","DTZ","TRY","T20"]`, with `max-complexity = 10` and `PLR0915` (max statements) tuned toward 60 lines.
2. Run `ruff check app --statistics` and save the output; this is the starting debt.
3. Generate a **per-file baseline**: a small script `scripts/gen_ruff_baseline.py` runs `ruff check --output-format json`, then writes `[tool.ruff.lint.per-file-ignores]` entries listing only the rule codes currently violated in each file. New files get **no** ignores, so they must be clean.
4. Fix the cheap, safe categories in this phase: `I` (import order), `UP`, `F401` (unused imports, including the unused `select/update/delete` in `developer.py`), `T201` (`print`), and `traceback.print_exc()` calls (replace with `logger.exception`). Use `ruff --fix`, review the diff, and run tests.
5. Add `ruff format` and apply it once in its own commit (add that commit to `.git-blame-ignore-revs`).

**Acceptance:** `ruff check app` and `ruff format --check app` pass; the baseline file exists and is committed.

---

## WP-1.3: Type checking and architecture contracts

**Steps**
1. Add mypy: `strict = true` for `app.core`, `app.utils`, `app.models`; `check_untyped_defs = true` globally; per-module `ignore_errors = true` overrides for the legacy `app.api.*` and `app.services.*` modules (documented as debt, removed one by one in P3). Use the SQLAlchemy 2.0 typing support (`Mapped[]` is already used).
2. Add `import-linter` in `.importlinter`:
   - Layer contract: `app.api` → `app.services` → `app.core` / `app.models` / `app.utils`. Nothing may import upward.
   - Forbidden contract (initially `ignore_imports` listing today's violations): `app.api` must not import `sqlalchemy.text`. This is the future "no SQL in routers" rule; the ignore list **is** the baseline.
3. Add `bandit -r app -ll` as an informational job first, then required once its findings are triaged.

**Acceptance:** `mypy app` and `lint-imports` pass with the documented baselines.

---

## WP-1.4: Pre-commit hooks

**Steps**
1. Add `.pre-commit-config.yaml`: `ruff` and `ruff-format`, `gitleaks`, `end-of-file-fixer`, `trailing-whitespace`, `check-yaml`, `check-added-large-files --maxkb=500`, and a local hook blocking `*.pdf`, `*.zip`, `.env*` additions.
2. Add a frontend hook running ESLint and Prettier on staged files (via `lint-staged`).
3. Document `pre-commit install` in `CONTRIBUTING.md` (written fully in P6; add the stub now).

**Acceptance:** committing a file with a fake `AKIA...` key or a `.zip` is blocked locally.

---

## WP-1.5: Rebuild the backend CI job

**Problem today:** the job points at `sqlite+aiosqlite`, which isn't installed and can't run the Postgres-only SQL.

**Steps**
1. Replace the job with services:
   - `postgres:16` with `POSTGRES_DB/USER/PASSWORD` env and `--health-cmd pg_isready`
   - `redis:7` with `--health-cmd "redis-cli ping"`
2. Steps: checkout → `astral-sh/setup-uv` (with cache) → `uv sync --frozen` → `ruff check` → `ruff format --check` → `mypy app` → `lint-imports` → `alembic upgrade head` → `pytest -n auto --cov=app --cov-report=xml --cov-fail-under=<current>`.
3. Set `--cov-fail-under` to the **measured current value rounded down**, not 40; it's a ratchet, not an aspiration. Record the value in `quality-baseline.json` (WP-1.8).
4. Provide the env: `DATABASE_URL=postgresql+asyncpg://...`, `REDIS_URL=redis://localhost:6379/0`, and test secrets that satisfy the production-safety check from P0 (≥32 chars).
5. Make `database.py` not pass Postgres pool arguments to non-Postgres URLs only if you still want a SQLite path; otherwise remove SQLite from tests entirely (recommended).
6. Upload the coverage report as an artifact.

**Acceptance:** the job is green on `main` and on a PR; deliberately breaking a test makes it red.

---

## WP-1.6: CRM linting and strictness

**Problem today:** CI runs `npx eslint src` but ESLint isn't installed for the CRM at all. The root `eslint.config.mjs` is Next.js-specific and doesn't cover `crm/`.

**Steps**
1. Install in `crm/`: `eslint@9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import` (or `eslint-plugin-boundaries`), `globals`, `prettier`, `eslint-config-prettier`.
2. Create `crm/eslint.config.js` (flat config):
   - `tseslint.configs.strictTypeChecked` (type-aware; `parserOptions.projectService: true`)
   - `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: error`
   - `jsx-a11y` recommended (raise to strict in P4)
   - `no-restricted-globals` for `fetch` (message: use `shared/api/client`), with an `overrides` block exempting the HTTP client file
   - `@typescript-eslint/no-explicit-any: warn` now, `error` in P4
   - `max-lines: ["warn", 300]`, `max-lines-per-function: ["warn", 80]`, `complexity: ["warn", 12]`
   - `no-console` allowing only `warn`/`error`
3. Run `eslint src -f json` and keep the counts; these seed the baseline. **Do not** mass-fix with `--fix` beyond formatting and trivially-safe rules.
4. Add `lint` and `typecheck` scripts to `package.json`.
5. Add Prettier config and run it once as a dedicated commit (add to `.git-blame-ignore-revs`).
6. Update CI to run `npm run lint -- --max-warnings=<baseline>` (the ratchet decides the exact number).

**Acceptance:** `npm run lint` runs and passes at the baseline; CI shows a real lint step.

---

## WP-1.7: TypeScript flags and dead-code detection

**Steps**
1. Enable, one at a time: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`. For each, run `tsc --noEmit` and **fix** the resulting errors (they're real dead code). Defer `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` to P4.
2. Add `knip` with a `knip.json` (entry: `src/main.tsx`, `vite.config.ts`, `vitest.config.ts`; project: `src/**/*.{ts,tsx}`). Save the current report. Don't delete the large dead modules yet (that's P4.4), but **list them** in `plans/p4-dead-code-inventory.md` so P4 starts with a worked list.
3. Add `size-limit` config with the current bundle sizes as the budget, to be tightened in P6.
4. Remove unused deps now (`clsx`, `tailwind-merge`) or adopt them in a `cn()` helper in P4 and note it in the inventory.

**Acceptance:** `tsc --noEmit` passes with the new flags; `knip` runs in CI as informational.

---

## WP-1.8: The ratchet system

**Purpose:** a script that fails CI if any tracked number gets worse.

**Steps**
1. Create `scripts/quality_ratchet.py` and `quality-baseline.json` at the repo root.
2. Metrics (each computed by a deterministic command; the script prints a table):

| Metric | How it's measured |
|---|---|
| `fe.any_count` | regex `\bany\b` in type positions via ESLint rule count |
| `fe.raw_fetch` | count of `\bfetch\(` outside `shared/api` |
| `fe.files_over_300` | files in `crm/src` with >300 lines |
| `fe.hex_colors` | regex `\[#[0-9A-Fa-f]{3,8}\]` in `crm/src` |
| `fe.unused_exports` | knip count |
| `fe.eslint_warnings` | total ESLint warnings |
| `be.except_exception` | count of `except Exception` / bare `except` in `backend/app` |
| `be.sql_in_api` | count of `text(` and `execute(` in `backend/app/api` |
| `be.files_over_400` | backend files with >400 lines |
| `be.routes_without_response_model` | from `app.openapi()` introspection |
| `be.ruff_baseline_entries` | total per-file ignore entries |
| `cov.backend`, `cov.frontend` | coverage percentage (higher is better) |

3. Rules: for "lower is better" metrics, `current <= baseline` or fail; for coverage, `current >= baseline` or fail. `--update` rewrites the baseline **only if** the numbers improved, so it can never be used to loosen a gate.
4. Add a CI job `ratchet` that runs after tests; post the table as a PR comment (use `actions/github-script`).
5. Add a unit test for the ratchet script itself.

**Acceptance:** introducing a new `any` or a new `except Exception` in a PR turns the `ratchet` job red.

---

## WP-1.9: Quick frontend fixes (no behaviour change)

1. **Duplicate `QueryClient`:** delete the one in [main.tsx](../crm/src/main.tsx) (`staleTime` 5 min), keep `lib/queryClient.ts` used by `App.tsx`. Confirm the retry policy stays the intended one.
2. **`manualChunks`** in [vite.config.ts](../crm/vite.config.ts): check specific packages (`@tanstack/react-query`, `lucide-react`) **before** the generic `react` match. Rebuild and confirm `vendor-query` and `vendor-icons` chunks exist.
3. **Chunk-retry:** consolidate the three mechanisms ([main.tsx:8-16](../crm/src/main.tsx), `lib/lazyWithRetry.ts`, `ErrorBoundary.tsx:39-41`) into `lazyWithRetry` plus one `vite:preloadError` handler with a single sessionStorage key.
4. **Coverage config:** set `vitest.config.ts` thresholds to the **measured** values and make the CI coverage step required (remove `continue-on-error`).
5. **Endpoint mismatch bug:** `SettingsPage` calls `/admin/audit-logs`; `api.getAuditLogs` uses `/admin/audit/logs`. Check the real backend route in `api/admin/audit.py`, and make both use the correct one.

**Acceptance:** `npm run build` output shows separate vendor chunks; one `QueryClient` exists; audit logs load.

---

## WP-1.10: Repository protections and hygiene

**Steps**
1. Branch protection on `main`: required status checks (`backend`, `crm`, `website`, `ratchet`, `codeql`, `gitleaks`), required PR review (self-review via checklist is fine for one developer), no force-push, linear history.
2. Add `.github/pull_request_template.md` with the Definition of Done checklist from `plans/README.md`.
3. Add a `gitleaks` workflow (full-history scan weekly, diff scan on PRs), `pip-audit` and `npm audit --omit=dev` (fail on high), and a `trivy` image scan (informational).
4. Group Dependabot updates (`groups:` in `dependabot.yml`) to limit PR noise.
5. Remove stray repo-root scripts with no owner: `patch.js`, `remove_boiler.py`, `rewrite_calendar.py`, `pdf+mockup.html`, `tsconfig.tsbuildinfo` (and ignore it), after confirming nothing references them.

---

## Exit criteria for P1
- [ ] CI is green on `main`; backend job uses real Postgres + Redis
- [ ] `ruff`, `ruff format`, `mypy`, `lint-imports`, ESLint, `tsc`, `knip`, `vitest`, build all run in CI
- [ ] Ratchet job runs and blocks regressions; baseline committed
- [ ] `uv.lock` committed; no unpinned dependencies
- [ ] Pre-commit hooks installed and documented
- [ ] Branch protection requires all checks
- [ ] Duplicate `QueryClient`, `manualChunks`, chunk-retry duplication fixed
- [ ] `plans/p4-dead-code-inventory.md` exists

## Hand-off to P2
The baseline values in `quality-baseline.json` are the starting line. P2 will raise coverage; every later phase lowers the other numbers.
