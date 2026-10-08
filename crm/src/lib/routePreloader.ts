import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { fetchPipelineDeals } from '@/api/pipelineApi';
import { leadsApi } from '@/api/leadsApi';
import { fetchClients } from '@/api/clientsApi';

// Route bundle pre-loaders: dynamically load JS module chunks on mouse hover
const routeChunkLoaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/DashboardPage'),
  '/pipeline': () => import('@/pages/PipelinePage'),
  '/leads': () => import('@/pages/LeadsPage'),
  '/clients': () => import('@/pages/ClientsPage'),
  '/estimates': () => import('@/pages/EstimatesPage'),
  '/contracts': () => import('@/pages/ContractsPage'),
  '/calendar': () => import('@/pages/CalendarPage'),
  '/tasks': () => import('@/pages/TasksPage'),
  '/jobs': () => import('@/pages/JobsPage'),
  '/inspections': () => import('@/pages/InspectionsPage'),
  '/finances': () => import('@/pages/FinancesPage'),
  '/warranties': () => import('@/pages/WarrantiesPage'),
  '/marketing': () => import('@/pages/MarketingPage'),
  '/analytics': () => import('@/features/analytics/AnalyticsPage'),
  '/settings': () => import('@/pages/SettingsPage'),
};

const prefetchedPaths = new Set<string>();

/**
 * Preload both the JS module chunk and primary data query on hover
 * so navigation executes with zero perceptible latency.
 */
export function preloadRoute(path: string): void {
  const base = path.split('?')[0];

  // 1. Preload JS bundle chunk (once per route)
  const chunkLoader = routeChunkLoaders[base];
  if (chunkLoader) {
    chunkLoader().catch(() => {});
  }

  // 2. Prefetch primary data query if not already warmed recently
  if (prefetchedPaths.has(base)) return;
  prefetchedPaths.add(base);
  setTimeout(() => prefetchedPaths.delete(base), 30_000); // 30s debounce

  try {
    if (base === '/pipeline') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.pipeline.deals(),
        queryFn: () => fetchPipelineDeals(),
        staleTime: 30_000,
      });
    } else if (base === '/leads') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.leads.list({ limit: 50, offset: 0 }),
        queryFn: () => leadsApi.listLeads({ limit: 50, offset: 0 }),
        staleTime: 30_000,
      });
    } else if (base === '/clients') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.clients.list({}),
        queryFn: () => fetchClients({}),
        staleTime: 30_000,
      });
    }
  } catch {
    // Silent catch for prefetch errors
  }
}
