# P4: Frontend Restructure

**Goal:** One typed API path generated from the backend contract, all server state in TanStack Query, an accessible shared UI kit, design tokens, no dead code or mock data, and small single-responsibility components.

**Prerequisites:** P3 exit criteria met (the OpenAPI schema is complete and `response_model`s exist); P1 lint/knip/ratchet and P2 tests/e2e/axe baselines in place.

**Delivers toward 10/10:** Frontend Type safety, State management, API layer, Component design, Duplication/dead code, Mock data, Styling, Effects, Accessibility, Testing.

---

## Target structure

```
crm/src/
  app/              providers (single QueryClient), router, error boundaries
  shared/
    api/            client.ts (the only HTTP client), generated/schema.ts, errors.ts
    ui/             Modal, Field, Button, IconButton, Table, StatCard, PageHero, Toast
    lib/            formatters, money, dates, cn()
    styles/         tokens (@theme), globals
  entities/<name>/  types (from generated), queries.ts, mutations.ts, keys (via queryKeys)
  features/<name>/  kanban-dnd, contract-builder, lead-inspector, schedule-operation, ...
  pages/            thin compositions
```

Dependency direction enforced by ESLint (`boundaries`/`import/no-restricted-paths`): `pages → features → entities → shared`. Nothing imports upward.

---

## WP-4.1: Typed API layer

1. Add `openapi-typescript` and `openapi-fetch`. Script `npm run api:generate` reads the backend's exported `openapi.json` (CI artifact from P3, or a committed snapshot) and writes `shared/api/generated/schema.ts`.
2. **CI guard:** a job regenerates the schema and fails if `git diff` is non-empty, so the types can't go stale.
3. `shared/api/client.ts`: create the single client on `openapi-fetch`, **preserving today's `ApiClient.request` behaviours** from [lib/api.ts](../crm/src/lib/api.ts): 12 s timeout via `AbortController`, `FormData` pass-through, FastAPI `detail`/new `error` envelope parsing, 401 → login redirect with a loop guard, public-endpoint exemptions (one list; remove the duplicate in `AuthContext.tsx:86`), `credentials: "include"`.
4. `shared/api/errors.ts`: a typed `ApiError` (`status`, `code`, `message`, `details`, `requestId`); replace `const error: any = new Error(...)`.
5. Use **relative `/api`** (proxied) as the base URL everywhere; drop `API_ORIGIN` and the host sniffing in `api.ts:9-16,25`. Environment config comes from a single typed `env.ts` (validated with zod on startup).
6. Migrate the modules that bypass the client: `jobsApi`, `pipelineApi`, `clientsApi`, `dashboardApi` (about 30 raw fetches), then `heroBannerApi`/`weatherApi` (`apiFetch`), then pages/components that fetch directly (`ContractsPage.tsx:137-165`, `estimates/wizard/PreviewPanel.tsx:63`; for PDF/HTML previews use `client.GET` with `parseAs: "blob"`/`"text"`).
7. Delete `apiFetch` and `API_ORIGIN`. Turn on ESLint `no-restricted-globals: fetch` as **error**.
8. Update MSW handlers to be typed against the generated schema (a handler returning the wrong shape fails type-check).

**Acceptance:** `fe.raw_fetch == 0`; `lib/api.ts` is gone or reduced to re-exports for a short deprecation window; types for every endpoint come from `schema.ts`.

---

## WP-4.2: Server state with TanStack Query

1. Use the `queryKeys` factory ([lib/queryKeys.ts](../crm/src/lib/queryKeys.ts)) for **every** key; add an ESLint rule (or a codemod + `no-restricted-syntax` on `queryKey: ["`) that bans string-literal keys.
2. For each entity (`lead`, `pipeline`, `client`, `estimate`, `contract`, `job`, `task`, `calendar`, `dashboard`, `report`, `settings`, `user`/`rbac`) create `entities/<name>/queries.ts` (`useXQuery`, `useXListQuery`) and `mutations.ts` (`useCreateX`, `useUpdateX`, `useMoveLead`, ...). Mutations invalidate through the factory, not literals (`['dashboard-stats']` vs `queryKeys.dashboard.stats()` mismatch is a current bug source).
3. **Optimistic updates** for the pipeline move via `onMutate`/`onError` rollback/`onSettled` invalidate. This replaces `lib/pipelineStore.ts` (copying query data into `useState`) and the mirrors in `useLeads.ts` and `useClients.ts`.
4. Replace all `useState + useEffect` data fetching (`useClients`, `useJobs`, `usePipelineData`, `SettingsPage`, about 25 UI files calling the API inside effects) with the new hooks. **Zero manual fetch effects** is the target.
5. Delete `syncEventBus`, the legacy `crm:lead-updated` events, and the 46 `CustomEvent`/`dispatchEvent` usages that exist only for data sync; replace with query invalidation. Keep event-based code only for genuinely UI-only cross-component signals (document each exception).
6. Standardise loading/empty/error states with shared components (`QueryBoundary` wrapping Suspense + ErrorBoundary + `useQueryErrorResetBoundary`). **Errors show error UI, never silent empty data or fake data**; remove the swallow-and-return-`[]` patterns (`pipelineApi.ts:41,43,139`, `systemApi.ts:162-164`).
7. `console.warn/error` (144 occurrences) become a `logger` wrapper that reports to Sentry (wired in P6) and is silent in tests; error handling moves to the Query `onError`/ErrorBoundary level.

**Acceptance:** `useQuery`/`useMutation` are the only fetch paths; each previously duplicated store is deleted; pipeline drag-and-drop still passes its e2e journey.

---

## WP-4.3: Remove localStorage-as-database

1. `calendarStore`, `personalTasksStore`: server-only through Query. Remove `MOCK_TASK_IDS`, `crm_registered_team_users` caching, focus-sync hacks.
2. `heroBannerStore`, `quoteBannerStore`, `weatherStore`: persist to `GET/PUT /me/preferences` (from P3) through Query; keep a **short-lived** optimistic local copy only for instant UI.
3. `localStorage` remains for: theme choice and purely local UI toggles. Wrap in one typed `useLocalStorage` hook; no other direct `localStorage` use (ESLint `no-restricted-globals`).
4. The auth token and `crm_user` are handled in P5; until then, access them only through `AuthContext`/client (remove the direct read in `ContractsPage.tsx`).
5. Migrate existing users' local preferences once (read old keys, `PUT` to the server, delete local keys).

---

## WP-4.4: Dead code and mock data removal

Start from `plans/p4-dead-code-inventory.md` (made in P1) and `knip`.
1. **Delete unused modules** (~2,900+ lines): `contracts/studio/*` (`ContractStudio`, `ContractLivePreview`, `ContractWizardProgress`), `pipeline/PipelineDealInspectorModal`, `settings/SettingsKpis`, `reports/ReportsHero`, `settings/SettingsHero`, `tasks/TasksHero`, `estimates/EstimateClientSearchSelect` and `reports/ExecutiveInsightsBar` if still unused after P2, `lib/charts/svgPathUtils.ts`, unused API constants (`API_KEY` in `pipelineApi.ts`).
2. **Delete `src/data/`** and the fixtures embedded elsewhere: `INITIAL_PIPELINE_DEALS` (`pipelineTypes.ts:418`), `INITIAL_TASKS`/`INITIAL_STICKY_NOTES`, `INITIAL_DISPATCH_EVENTS`/`WEATHER_ALERTS`/`CRM_JOBS_PRESET`, `PAST_ESTIMATES`, `EXECUTIVE_INSIGHTS`, `CRM_LEAD_PRESETS`, `INITIAL_TEAM_MEMBERS`/`INITIAL_USER_ROLES`/`INITIAL_SECURITY_SESSIONS`/`INITIAL_AUDIT_LOGS`/`INITIAL_INTEGRATIONS`. Move anything that is genuine static configuration (`CATEGORY_CONFIG`, `ROOFING_MATERIALS` if still used) to `shared/config/`.
3. **Remove mock fallbacks:** `systemApi.ts` `DEFAULT_FALLBACK_KPIS` (show "unavailable"), `ExecutiveInsightsBar` hard-coded insights, fabricated emails in the client search (`${name}@gmail.com`), fake invoices and revenue badges on `FinancesPage`, fabricated "Initial inspection scope…" notes in `PipelineDealModal.tsx:195`, hard-coded dev emails in `utils/devUtils.ts` (replace with a server-provided flag on `/me`).
4. SettingsPage seeds with real API data only; `integrations` and `sessions` load from the API (or the tab is hidden if there is no endpoint).
5. Remove unused dependencies (`knip`), and decide on `clsx`/`tailwind-merge` (adopt via `shared/lib/cn.ts`, or remove).

**Acceptance:** `knip` reports 0 unused files/exports/dependencies; `src/data/` doesn't exist; searching the production bundle for `Patricia Gomez`, `Marc Sarellano` and `David Martinez` finds nothing.

---

## WP-4.5: Shared UI kit (accessibility foundations)

1. **`shared/ui/Modal`** (replaces `CrmModal` and the 42 hand-rolled `fixed inset-0` overlays): `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`, focus trap, initial focus, focus restore, Escape and backdrop close, **ref-counted body scroll lock** (fixes the conflict where `PipelineDealModal.tsx:228-237` resets `overflow` when nested modals close), portal rendering, no `select-none` on the whole dialog. Consider building on the `<dialog>` element or `@radix-ui/react-dialog` instead of hand-rolling focus management; decide in the first PR and record an ADR.
2. **`Field`:** wraps a label, control, hint and error, generates `id`/`htmlFor`/`aria-describedby`/`aria-invalid` automatically. This removes the "324 labels, 0 `htmlFor`" problem by construction.
3. **`Button`/`IconButton`** (icon buttons require `aria-label`; typed), **`Table`**, **`StatCard`** (fold `UniversalStatCard`'s 482 lines), **`PageHero`** (`CrmPageHero`), **`Toast`**.
4. Add unit tests for Modal (focus trap, restore, nested scroll lock, Escape) and Field.
5. Migrate the 42 modals gradually, **most-used first**, deleting each hand-rolled overlay. Track via `grep -c "fixed inset-0"` in the ratchet.
6. Turn `jsx-a11y` rules to **error**. Convert clickable `div`/`span`/`tr`/`li` (~128) to real `button`/`a`, or add `role`, `tabIndex`, key handlers where drag-and-drop requires a div (e.g. `KanbanDealCard`: add keyboard alternatives like a "Move to…" menu button).
7. Add `alt` to the 24 images missing it (decorative → `alt=""`).

---

## WP-4.6: Design tokens

1. Define tokens in `shared/styles/tokens.css` under `@theme`: brand palette (`--color-brand-50…900` with `#1878B8` as the base), semantic colours (`surface`, `surface-raised`, `border`, `text`, `text-muted`, `danger`, `success`, `warning`), radius, shadows (incl. dark equivalents), and a type scale with minimum text size **11px** (`--text-2xs`).
2. Dark mode only through `dark:` variants / CSS variables that flip under `.dark`; remove the 31 `isDark ? ... : ...` ternaries (e.g. `DashboardPage.tsx:64-69`).
3. Write a **codemod** (`jscodeshift` or a careful script) mapping the 554 `#1878B8` usages and the most common arbitrary hex values to token classes (`bg-brand-600`, `text-muted`). Review the diff per directory; run Playwright screenshot checks on key pages before/after.
4. Replace `text-[7…9.5px]` (285 uses) with the type scale; fix layouts that relied on tiny text.
5. Add a lint rule (`no-restricted-syntax` on `-\[#`, or `eslint-plugin-tailwindcss` `no-arbitrary-value` scoped to colours and font sizes) set to **error**; the ratchet tracks `fe.hex_colors` down to 0.
6. Replace the 120 inline `style={{}}` with classes; dynamic values use CSS variables.

---

## WP-4.7: Break up the god components

Sequence by value and risk; each is its own PR with its e2e journey green.

1. **`features/kanban-dnd`:** extract `useKanbanDnD` (drag start/over/drop, drop intent, backward-move prompt, follow-up, gated estimate-sent, schedule move) and one `DealCard`, then use them in **both** `PipelinePage` (1,117 lines, 26 `useState`) and `DashboardPage` (980, 32 `useState`). Delete `DashboardDealCard` or `KanbanDealCard` (whichever is the duplicate), the duplicated `handleDragStart/Over/Drop` and `handleConfirmScheduleMove`, and the copied Cmd+K listeners (one `useCommandPalette`/`useHotkey` hook). Replace magic numbers (`colWidth = 315`, stage count `8`) with config. Add `useEffect` cleanup for the highlight `setTimeout` and the missing dependency arrays flagged at `PipelinePage.tsx:139-178`.
2. **Modal bags:** `LeadModals` (20 props) and `PipelineModals` (~25 props) → a small `useModalStack()` store (zustand) where features open modals by id with typed payloads; pages stop owning modal state.
3. **`PipelineDealModal` (1,119 lines, 21 `useState`):** split into tabs/sections (`DealSummary`, `DealNotes`, `DealDocuments`, `DealTimeline`), each with its own query hook. Fix the effect at `:182-226`: key the query by deal id (not the whole object), drop the manual fetch effect, remove stale-response risk, delete fabricated notes.
4. **`ClientsPage` (1,095), `TeamRolesPermissionMatrix` (1,085), `AuthorizedSignatoriesTab` (896), `PricingFormulasTab` (833), `TeamMembersList` (810), `ProfileSettingsModal` (699), `LeadInspectModal` (675):** extract sections, hooks and table/row components until each is ≤300 lines; move business rules to `entities/*/rules.ts` with unit tests.
5. **Customizer modals** (`HeroBannerCustomizerModal` 848, `WeatherCustomizerModal` 829, `QuoteBannerCustomizerModal` 770): a shared `CustomizerShell` (layout, preview pane, save/reset) plus per-feature option panels.
6. **Effects hygiene:** every remaining `useEffect` either synchronises with an external system (document it) or is removed; derived values computed during render; `react-hooks/exhaustive-deps` at **error**.

**Acceptance:** `fe.files_over_300 == 0`; no component with >6 `useState`s (custom ESLint rule or review checklist); duplicate drag-and-drop code is gone.

---

## WP-4.8: Forms with react-hook-form + zod

1. Add `react-hook-form` and `@hookform/resolvers`. Use schemas derived from the generated API types plus UI-level refinements (phone/email from `utils/contactValidation.ts`).
2. Migrate the big forms first: `CreateExistingClientModal` (27 `useState`s: remove hard-coded defaults like `'Oceanside'`/`'92054'`/`'Eagle Concrete Tile'`, move them to company settings), `CreateLeadModal`, `ClientEditContactModal`, `ProfileSettingsModal`, `CreateTaskModal`, `InviteUserModal`, settings tabs.
3. Forms render with `Field` (WP-4.5) so labels and errors are accessible by default; submit buttons show pending/disabled state via the mutation.
4. Keep the P2 form characterisation tests green (field → payload mapping unchanged).

---

## WP-4.9: One contract builder, no demo defaults

1. **Inventory:** `contracts/wizard/*` (used by `ContractsPage`) vs `pipeline/ContractBuilderModal` + `pipeline/contract/*` (used by `PipelineDealModal`). Compare the feature sets and form models (`ContractFormState`, with `PaymentRow.amount` as string, versus the wizard's model).
2. **Decision (record as an ADR):** keep the wizard as the base (richer step set) → `features/contract-builder`; fold anything unique from the pipeline builder into it.
3. One zod `ContractFormSchema` and one typed DTO (replace the `(data as any)` snake/camel fallbacks in `generateContractHtml.ts:50-70`), with money handled as `Decimal` strings via `shared/lib/money`.
4. **Missing required data is a validation error, never a demo default:** remove `'September 22, 2026'`, `'Marc Sarellano'`, `'#1096492'`, `31000`, `1000`, the insurance phone numbers and the default 8 scope sections / payment rows from `generateContractHtml.ts:114-180`. Company and salesperson data come from company settings and the logged-in user; scope/payment templates come from the backend (template endpoint) or an explicit "start from template" action chosen by the user.
5. **Single source of HTML:** preferably render from the backend template (`templates/contracts/contract.html`) via a preview endpoint so the PDF and on-screen preview can't diverge; delete `generateContractHtml.ts` (1,142 lines) once the backend preview is used. Keep the sandboxed iframe (`sandbox=""`) for the preview.
6. Delete `pipeline/ContractBuilderModal`, `pipeline/contract/*`, the duplicate `ContractWizardProgress`, and the dead studio (if not already removed in WP-4.4).
7. Flip the P2 `xfail` (demo defaults) and keep the signing-wizard e2e journey green.

---

## WP-4.10: Unfinished pages

For `FinancesPage`, `InspectionsPage`, `ReviewsPage`, `TemplatesPage`, `WarrantiesPage` (the pages showing `DevelopmentInProgressBanner`):
1. Add a typed feature-flag mechanism (`/me` returns enabled features; `useFeature("finances")`).
2. Pages with no real backend yet are hidden from navigation and routes (redirect to the dashboard) and removed from search/command palette. No fake data anywhere.
3. `FinancesPage` keeps only what is backed by `api.getFinances()`; delete the in-render `INVOICES` array and hard-coded badges.
4. Record the "build these properly" work as separate roadmap items outside this plan.

---

## WP-4.11: Type strictness and tooling finish

1. `@typescript-eslint/no-explicit-any` → **error**; the ratchet `fe.any_count` reaches 0. Where unknown shapes remain (third-party payloads, `localStorage` JSON), use `unknown` + zod parsing.
2. Enable `noUncheckedIndexedAccess` and fix findings; then `exactOptionalPropertyTypes` if the error volume is reasonable.
3. Remove duplicate types (`Lead` in `api/leadsApi.ts` and `types/leadTypes.ts`; `DealCard` in `dashboardTypes.ts` and `pipelineTypes.ts`); domain types now come from `entities/*` (generated). The `api → components/pipeline/pipelineTypes` layering inversion disappears with the import-boundary rule.
4. Raise `jsx-a11y` to strict, `react-hooks` to error, `max-lines` and `complexity` to error.
5. Upgrade `vitest` to a version aligned with Vite 6, and refresh lockfile deps (`npm outdated` review).

---

## WP-4.12: Frontend tests to the target

1. Unit/component tests for each `entities/*` hook (MSW) and `features/*` component (user-event): loading, success, empty, error, permission-denied, optimistic rollback.
2. Interaction tests for Modal, Field, kanban keyboard alternative, contract builder validation.
3. Keep all 8 Playwright journeys green with **no `test.fail` left** (every earlier `test.fail` is now fixed).
4. Run axe across all routes in both themes; fix until `fe.axe_serious_critical == 0`. Add keyboard-only e2e for: open/close modal, move a deal without a mouse, submit a form with errors.
5. Coverage ≥80% on `entities/` and `features/`; raise global thresholds in `vitest.config.ts` and the ratchet baseline.

---

## Exit criteria for P4
- [ ] `fe.any_count == 0`; `no-explicit-any` is an error
- [ ] `fe.raw_fetch == 0`; exactly one HTTP client; types generated from OpenAPI with a CI staleness check
- [ ] No server data in localStorage; no `CustomEvent` data sync; one `QueryClient`; no string-literal query keys
- [ ] `knip` clean; `src/data/` deleted; no mock/fake data in the bundle
- [ ] `fe.files_over_300 == 0`; no component with >6 `useState`
- [ ] One kanban implementation, one contract builder; no demo defaults in contracts
- [ ] Shared accessible Modal used everywhere; `Field` provides label association by construction
- [ ] `fe.hex_colors == 0`; no text under 11px; no `isDark` ternaries for styling
- [ ] axe: 0 serious/critical on every route, both themes; keyboard journeys pass
- [ ] Coverage ≥80% on `entities/` and `features/`; 8 e2e journeys green
- [ ] Unfinished pages hidden behind flags

## Hand-off to P5
List every place that still reads `crm_auth_token` or `crm_user` (should be only `AuthContext` and the client) so P5 can switch to cookie sessions in one place.
