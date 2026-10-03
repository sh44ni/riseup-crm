# ADR-001: Unified Contract Builder

## Status
Accepted

## Context
Prior to Phase 4, RiseUp CRM contained two parallel and diverging contract creation interfaces:
1. `contracts/wizard/*` (used by `ContractsPage`): An 8-step wizard featuring live Letter-sized PDF preview panel, real-time draft autosaving, lead prefill, step-by-step progress tracking, signature options, and SMS/email dispatch.
2. `pipeline/ContractBuilderModal.tsx` + `pipeline/contract/*` (used by `PipelineDealModal`): A 4-step modal with hardcoded mock scopes and payment math.

This duplicate implementation caused divergence in form models, state management, and validation logic. Furthermore, `generateContractHtml.ts` contained hardcoded fallback defaults (`Marc Sarellano`, `Edith Guerrero`, `#1096492`, `$31,000`, `accountant@riseuprac.com`, and hardcoded scope sections) that could leak mock data into customer documents.

## Decision
1. **Single Canonical Contract Builder**: Consolidate all contract creation workflows on the wizard architecture (`ContractWizardShell`), exposed via `features/contract-builder`.
2. **Retire Duplicate Pipeline Contract Components**: Delete `pipeline/ContractBuilderModal.tsx` and `pipeline/contract/*`, replacing their modal trigger in `PipelineDealModal` with the canonical contract wizard passing deal prefill attributes.
3. **Strict Validation over Demo Defaults**: Eliminate hardcoded fallbacks from `generateContractHtml.ts`. Missing required contract fields (client details, contractor licensing, project address, pricing, scope sections, payment milestones) are treated as explicit validation errors (`ContractValidationError`) rather than defaulting to hardcoded mock data.
4. **Zod Schema & Typed DTO**: Enforce validation using `ContractFormSchema` in `features/contract-builder/contractSchema.ts` and handle currency/money operations using `shared/lib/money.ts`.

## Consequences
- **Positive**: Single source of truth for contract creation and preview throughout the CRM; guaranteed prevention of mock data leakage in production documents; elimination of over 1,000 lines of duplicate UI code; full TypeScript and Zod safety.
- **Negative / Mitigations**: Partial drafts cannot render an official legal HTML preview until minimum required fields are provided. The preview panel handles this gracefully by presenting a clean draft-in-progress state rather than crashing.
