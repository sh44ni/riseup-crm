import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CompanyProvider } from '@/context/CompanyContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CrmLayout } from '@/components/layout/CrmLayout';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { PageLoadingFallback } from '@/components/layout/PageLoadingFallback';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

function ContractSignRedirect() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={`/contract/sign/${token || ''}`} replace />;
}

const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'));
const AcceptInvitePage = lazyWithRetry(() => import('@/pages/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));
const DashboardPage = lazyWithRetry(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PipelinePage = lazyWithRetry(() => import('@/pages/PipelinePage').then(m => ({ default: m.PipelinePage })));
const LeadsPage = lazyWithRetry(() => import('@/pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const ClientsPage = lazyWithRetry(() => import('@/pages/ClientsPage').then(m => ({ default: m.ClientsPage })));
const EstimatesPage = lazyWithRetry(() => import('@/pages/EstimatesPage').then(m => ({ default: m.EstimatesPage })));
const ContractsPage = lazyWithRetry(() => import('@/pages/ContractsPage').then(m => ({ default: m.ContractsPage })));
const JobsPage = lazyWithRetry(() => import('@/pages/JobsPage').then(m => ({ default: m.JobsPage })));
const CalendarPage = lazyWithRetry(() => import('@/pages/CalendarPage'));
const InspectionsPage = lazyWithRetry(() => import('@/pages/InspectionsPage').then(m => ({ default: m.InspectionsPage })));
const FinancesPage = lazyWithRetry(() => import('@/pages/FinancesPage').then(m => ({ default: m.FinancesPage })));
const SettingsPage = lazyWithRetry(() => import('@/pages/SettingsPage'));
const TasksPage = lazyWithRetry(() => import('@/pages/TasksPage'));
const ReportsPage = lazyWithRetry(() => import('@/pages/ReportsPage'));
const WarrantiesPage = lazyWithRetry(() => import('@/pages/WarrantiesPage'));
const MarketingPage = lazyWithRetry(() => import('@/pages/MarketingPage').then(m => ({ default: m.MarketingPage })));
const ContractSignWizardPage = lazyWithRetry(() => import('@/pages/ContractSignWizardPage').then(m => ({ default: m.ContractSignWizardPage })));
const ChangelogPage = lazyWithRetry(() => import('@/pages/ChangelogPage'));

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ToastProvider } from '@/context/ToastContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary fallbackTitle="CRM Application Error">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <ThemeProvider>
                <ToastProvider>
                  <React.Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/contract/sign/:token" element={<ContractSignWizardPage />} />
                <Route path="/sign/contract/:token" element={<ContractSignRedirect />} />
                <Route path="/changelogs" element={<ChangelogPage />} />

              <Route element={<CrmLayout />}>
                <Route index element={<DashboardPage />} />
                
                <Route
                  path="pipeline"
                  element={
                    <PermissionRoute permission="pipeline.view">
                      <PipelinePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="leads"
                  element={
                    <PermissionRoute permission="leads.view">
                      <LeadsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="clients"
                  element={
                    <PermissionRoute permission="clients.view">
                      <ClientsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="estimates"
                  element={
                    <PermissionRoute permission="estimates.view">
                      <EstimatesPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="contracts"
                  element={
                    <PermissionRoute permission="contracts.view">
                      <ContractsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="jobs"
                  element={
                    <PermissionRoute permission="jobs.view">
                      <JobsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <PermissionRoute permission="calendar.view">
                      <CalendarPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="tasks"
                  element={
                    <PermissionRoute permission="tasks.view">
                      <TasksPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <PermissionRoute permission="reports.view">
                      <ReportsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="marketing"
                  element={
                    <PermissionRoute permission="reports.view">
                      <MarketingPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="inspections"
                  element={
                    <PermissionRoute permission="inspections.view">
                      <InspectionsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="finances"
                  element={
                    <PermissionRoute permission="finances.view">
                      <FinancesPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="warranties"
                  element={
                    <PermissionRoute permission="warranties.view">
                      <WarrantiesPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <PermissionRoute permission="roles.view">
                      <SettingsPage />
                    </PermissionRoute>
                  }
                />
                <Route path="users" element={<Navigate to="/settings?tab=users" replace />} />
                <Route path="team" element={<Navigate to="/settings?tab=users" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </React.Suspense>
            </ToastProvider>
            </ThemeProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;
