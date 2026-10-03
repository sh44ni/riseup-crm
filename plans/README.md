# Rise Up CRM: Path to 10/10 (Single-Developer Plans)

Baseline (from the code audit): Frontend 4.0, Backend 3.2, Combined 3.6.
Goal: every category at 10/10, with each category backed by a **CI-enforced, measurable bar**.

## Phase plans (execute in this order)

| # | Plan | Purpose | Starts when |
|---|---|---|---|
| P0 | [P0-security-hotfix.md](P0-security-hotfix.md) | Close the critical vulnerabilities and fix endpoints that are broken today | Immediately |
| P1 | [P1-foundations-and-gates.md](P1-foundations-and-gates.md) | Tooling, working CI, ratchet gates, pre-commit | P0 merged and deployed |
| P2 | [P2-test-harness.md](P2-test-harness.md) | Real-DB HTTP tests, authz matrix, e2e and a11y tests: the safety net | P1 CI is green and required |
| P3 | [P3-backend-restructure.md](P3-backend-restructure.md) | Router → service → repository, typed schemas, errors, migrations | P2 exit criteria met |
| P4 | [P4-frontend-restructure.md](P4-frontend-restructure.md) | Generated API types, React Query everywhere, UI kit, dead-code removal | P3 exit criteria met (OpenAPI now has real response models) |
| P5 | [P5-auth-and-contract-unification.md](P5-auth-and-contract-unification.md) | httpOnly cookie sessions, CSRF, CSP, principal separation | P3 and P4 exit criteria met |
| P6 | [P6-hardening-and-polish.md](P6-hardening-and-polish.md) | Docker, observability, performance budgets, docs, final re-audit | P5 merged |

> One developer means the phases run **sequentially**. P3 deliberately comes before P4: the frontend's generated types are only useful once the backend declares real `response_model`s.

## Assumptions (change any of these and the affected plan needs a small edit)

| Decision | Assumed | Affects |
|---|---|---|
| Session auth moves from localStorage token to httpOnly cookie | Yes | P5, P4.1 |
| SQL style | Hand-written SQL kept, but only inside repositories | P3 |
| Unfinished pages (Finances, Inspections, Reviews, Templates, Warranties) | Hidden behind feature flags, no fake data | P4 |
| UI-only client state library | zustand | P4 |
| Git history rewrite + force-push after secrets are rotated | Yes | P0 |

## Working agreements

1. **One branch per work package**, small PRs, squash-merge. Branch names: `p3/leads-service`, `p4/ui-modal`.
2. **Never merge red CI.** From P1 onward, the ratchet check is a required status.
3. **Tests first, refactor second.** A domain isn't restructured until it has characterisation tests (P2).
4. **Ratchet, don't regress.** `quality-baseline.json` can only decrease (see P1). If a PR improves a metric, lower the baseline in that same PR.
5. **Every PR description answers:** What changed? How was it verified? What's the rollback?
6. **Deploy to staging before production** for every phase. Keep each phase deployable on its own.
7. **No new `any`, raw `fetch`, bare `except Exception`, SQL in routers, or hard-coded colours**, even in code you're about to delete.
8. **Secrets never go in plan files, commits or logs.** Plans use placeholders such as `<OLD_KEY>`.

## Definition of Done (applies to every work package)

- [ ] Code merged to `main` through a PR with green CI
- [ ] Tests added or updated, and they fail without the change
- [ ] Ratchet baseline lowered if any tracked metric improved
- [ ] No new lint, type or a11y warnings
- [ ] Verified on staging
- [ ] Rollback path known and written in the PR
- [ ] Docs or ADR updated if a pattern changed

## The 10/10 bar at a glance

**Backend:** 0 Critical/High security findings; every route has an auth dependency (test-enforced); no SQL in `app/api`; no function over 60 lines; no `except Exception: pass`; 100% routes typed with `response_model`; Alembic is the only schema path; coverage ≥85% line / ≥75% branch; locked dependencies; non-root image.

**Frontend:** 0 `any`; one HTTP client and 0 raw `fetch`; all server state in TanStack Query; no component over 300 lines; `knip` clean; 0 mock data in the bundle; design tokens with 0 hard-coded hex; axe 0 serious/critical; httpOnly cookie auth; coverage ≥80% on `entities/` and `features/`; 8 e2e journeys green.

Each phase plan lists which parts of this bar it delivers.
