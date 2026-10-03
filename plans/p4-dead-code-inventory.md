# P4 Dead Code Inventory

Generated during **P1 (Foundations & Quality Gates)** via Knip and TypeScript analysis.
Target cleanup phase: **P4 (CRM and Website Cleanup)**.

---

## 1. Unused Files (38 Files)

These files have 0 incoming imports across the repository and are candidates for complete removal in P4:

### A. Dead Pages (2 files)
- `crm/src/pages/ReviewsPage.tsx` - Orphaned reviews management page not mounted in router.
- `crm/src/pages/TemplatesPage.tsx` - Orphaned template page superseded by inline templates.

### B. Legacy Estimate Wizard & Components (12 files)
The CRM was migrated to modern proposal/estimate components; these legacy components and data mocks are completely unreferenced:
- `crm/src/data/estimateData.ts` (mock estimate items & pricing data)
- `crm/src/types/estimateTypes.ts` (legacy type definitions superseded by `estimateContractTypes.ts`)
- `crm/src/components/estimates/EstimateClientPhotoUpload.tsx`
- `crm/src/components/estimates/EstimateClientSearchSelect.tsx`
- `crm/src/components/estimates/EstimateLiveSummary.tsx`
- `crm/src/components/estimates/EstimateMultiOptionBuilder.tsx`
- `crm/src/components/estimates/EstimatePhotoUploader.tsx`
- `crm/src/components/estimates/EstimatePricingEngine.tsx`
- `crm/src/components/estimates/EstimateProposalPreview.tsx`
- `crm/src/components/estimates/EstimateStepMaterial.tsx`
- `crm/src/components/estimates/EstimateStepPricing.tsx`
- `crm/src/components/estimates/EstimateStepScope.tsx`
- `crm/src/components/estimates/EstimateStepSpecs.tsx`
- `crm/src/components/estimates/EstimateTemplateSelector.tsx`

### C. Contract Studio Legacy Modules (4 files)
Superceded by the active Contract Wizard:
- `crm/src/components/contracts/studio/ContractLivePreview.tsx`
- `crm/src/components/contracts/studio/ContractStudio.tsx`
- `crm/src/components/contracts/studio/ContractWizardProgress.tsx`
- `crm/src/components/contracts/wizard/steps/ContractPricingStep.tsx`

### D. Settings & Management Orphaned Tabs (6 files)
Replaced by modular subviews or inline components:
- `crm/src/components/settings/IntegrationsTab.tsx`
- `crm/src/components/settings/InviteUserModal.tsx`
- `crm/src/components/settings/SecurityBackupsTab.tsx`
- `crm/src/components/settings/SettingsHero.tsx`
- `crm/src/components/settings/SettingsKpis.tsx`
- `crm/src/components/settings/UsersManagementTab.tsx`

### E. Reports & Dashboard Orphaned Widgets (4 files)
- `crm/src/data/reportData.ts` (hardcoded mock analytics data)
- `crm/src/components/reports/ExecutiveInsightsBar.tsx`
- `crm/src/components/reports/LeadSourcesRoiTab.tsx`
- `crm/src/components/reports/ReportsHero.tsx`

### F. Pipeline & Jobs Orphaned Modals (4 files)
- `crm/src/components/jobs/CreateJobModal.tsx`
- `crm/src/components/jobs/JobsKanbanView.tsx`
- `crm/src/components/pipeline/CompleteJobModal.tsx`
- `crm/src/components/pipeline/PipelineDealInspectorModal.tsx`

### G. Unused Stores & Utilities (4 files)
- `crm/src/lib/client360Store.ts` - Client 360 local state store superseded by React Query / direct API.
- `crm/src/lib/queryKeys.ts` - Query keys factory superseded by inline keys.
- `crm/src/components/tasks/TasksHero.tsx` - Orphaned tasks banner.
- `crm/src/lib/charts/svgPathUtils.ts` - Replaced by Recharts / SVG utilities.

---

## 2. Unused Dependencies

- `clsx`: Installed in `crm/package.json` but never imported.
- `tailwind-merge`: Installed in `crm/package.json` but never imported.
  > **P4 Recommendation**: Either create standard `cn(...inputs: ClassValue[])` utility combining `clsx` and `tailwind-merge` to clean up class string concatenations, or remove both dependencies.
- `@testing-library/user-event`: Installed in devDependencies but unreferenced in existing Vitest test suites.

---

## 3. Duplicate Exports (40 instances)

Files exporting both named component and default export:
- `src/App.tsx` (`App` and `default`)
- `src/pages/LoginPage.tsx` (`LoginPage` and `default`)
- `src/pages/CalendarPage.tsx` (`CalendarPage` and `default`)
- `src/pages/SettingsPage.tsx` (`SettingsPage` and `default`)
- `src/pages/TasksPage.tsx` (`TasksPage` and `default`)
- `src/pages/ReportsPage.tsx` (`ReportsPage` and `default`)
- `src/pages/WarrantiesPage.tsx` (`WarrantiesPage` and `default`)
- `src/components/layout/CrmSidebar.tsx` (`CrmSidebar` and `default`)
- `src/components/common/CoastalPalmTrees.tsx`
- `src/components/common/CrmPageHero.tsx`
- `src/components/common/UniversalStatCard.tsx`
- `src/components/contracts/wizard/ContractWizardShell.tsx`
- `src/components/contracts/wizard/ContractPreviewPanel.tsx`
- `src/components/contracts/wizard/ContractWizardProgress.tsx`
- `src/components/contracts/wizard/steps/ContractDetailsStep.tsx`
- `src/components/contracts/wizard/steps/ContractScopeStep.tsx`
- `src/components/contracts/wizard/steps/ContractDatesPricingStep.tsx`
- `src/components/contracts/wizard/steps/ContractPaymentScheduleStep.tsx`
- `src/components/contracts/wizard/steps/ContractTermsStep.tsx`
- `src/components/contracts/wizard/steps/ContractSignaturesStep.tsx`
- `src/components/contracts/wizard/steps/ContractCancellationStep.tsx`
- `src/components/contracts/wizard/steps/ContractReviewSendStep.tsx`
- `src/components/calendar/CalendarFilterBar.tsx`
- `src/components/calendar/CalendarMonthGrid.tsx`
- `src/components/calendar/CalendarSwimlanesView.tsx`
- `src/components/calendar/CalendarDayInspector.tsx`
- `src/components/calendar/ScheduleOperationModal.tsx`
- `src/components/common/DevelopmentInProgressBanner.tsx`
- `src/components/reports/RevenueVelocityTab.tsx`
- `src/components/reports/SalesRepLeaderboardTab.tsx`
- `src/components/shared/LeadSourceBadge.tsx`
- `src/components/common/HeroBannerCustomizerModal.tsx`
- `src/components/contracts/signing/SignaturePad.tsx`
- `src/api/calendarApi.ts` (alias pairs like `fetchCalendarOperations`, `createTeamTask`, `updateTeamTask`, `deleteTeamTask`)

> **P4 Recommendation**: Standardize on named exports everywhere across `src/components` and default exports only for lazy-loaded route pages.

---

## 4. Unused Exports & Types

### Notable Unused API Functions
- `src/api/calendarApi.ts`: `fetchCalendarOperations`, `createTeamTask`, `updateTeamTask`, `deleteTeamTask`
- `src/api/clientsApi.ts`: `checkClientEmail`, `archiveClient`
- `src/api/contractApi.ts`: `getContractsByLead`, `signContract`
- `src/api/heroBannerApi.ts`: `fetchHeroBannerForPage`
- `src/api/jobsApi.ts`: `deleteJob`
- `src/api/leadsApi.ts`: `backendLeadToLead`, `frontendStatusToBackend`
- `src/api/marketingApi.ts`: `fetchMarketingCalls`, `fetchMarketingHeatmap`
- `src/api/weatherApi.ts`: `fToC`, `cToF`, `normalizeConditionKey`, `checkWeatherBackendOnline`

### Notable Unused Mock & Initial Data
- `src/data/calendarData.ts`: `INITIAL_DISPATCH_EVENTS`, `WEATHER_ALERTS`, `CRM_JOBS_PRESET`
- `src/data/estimateConstants.ts`: `ESTIMATE_DESIGN_TOKENS`, `DEFAULT_IMPORTANT_NOTE`
- `src/data/taskData.ts`: `INITIAL_TASKS`, `INITIAL_STICKY_NOTES`
- `src/components/pipeline/pipelineTypes.ts`: `LOSS_REASONS`, `INITIAL_PIPELINE_DEALS`

### Notable Unused Types (36)
- `src/api/calendarApi.ts`: `CalendarEventsApiResponse`, `SingleCalendarEventApiResponse`
- `src/api/clientsApi.ts`: `CheckEmailResponse`
- `src/api/contractApi.ts`: `ContractRecord`
- `src/api/personalTasksApi.ts`: `PersonalTasksListResponse`, `SinglePersonalTaskResponse`
- `src/api/quoteBannerApi.ts`: `QuoteBannerApiResponse`
- `src/types/client360Types.ts`: `AssignedRep`, `InspectionPhoto`
- `src/types/contractStudioTypes.ts`: `ContractStudioStepDef`
- `src/types/estimateContractTypes.ts`: `EstimateClient`, `BuiltinIcon`
- `src/types/jobTypes.ts`: `JobFilterTab`
- `src/types/leadTypes.ts`: `LeadStatus`, `LeadLossReason`
- `src/types/marketingTypes.ts`: `LocationCountItem`, `WeekdayCountItem`, `EventTypeCountItem`
- `src/types/reportTypes.ts`: `RevenueDataPoint`, `MaterialRevenueSplit`, `LeadSourceMetric`, `SalesRepPerformance`, `ExecutiveInsight`, `SpeedToLeadBucket`, `SpeedToLeadDistributionResponse`
- `src/types/settingsTypes.ts`: `EstimatorServiceItem`
- `src/types/taskTypes.ts`: `TaskCategoryMeta`
- `src/utils/dealValue.ts`: `ValueSource`

---

## 5. Phase 4 Execution Roadmap

1. **Step 1: Delete Dead Files (38 files)**
   - Remove files in batches and run `npx tsc --noEmit` after each batch to ensure zero regressions.
2. **Step 2: Clean up Mock Constants & Unused API Functions**
   - Remove orphaned mock structures (`INITIAL_TASKS`, `INITIAL_DISPATCH_EVENTS`, `INITIAL_PIPELINE_DEALS`).
   - Prune unreferenced endpoints from `src/api/`.
3. **Step 3: Unify Component Exports**
   - Eliminate duplicate named/default exports.
4. **Step 4: Enable Strict Flags in `crm/tsconfig.json`**
   - Turn on `noUnusedLocals: true` and `noUnusedParameters: true`.
   - Remove unused icon imports and dead local variables across remaining 177 files.
5. **Step 5: Bundle Size Reduction & `cn()` Standardization**
   - Establish `cn()` utility or remove `clsx`/`tailwind-merge`.
