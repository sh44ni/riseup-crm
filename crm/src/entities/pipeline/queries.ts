import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchPipelineDeals, fetchPipelineForDashboard, fetchPipelineAnalytics } from '@/api/pipelineApi';

export function usePipelineDealsQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.pipeline.deals(),
    queryFn: () => fetchPipelineDeals(),
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled,
  });
}

export function usePipelineDashboardQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.pipeline.kanban(),
    queryFn: () => fetchPipelineForDashboard(),
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled,
  });
}

export function usePipelineAnalyticsQuery() {
  return useQuery({
    queryKey: queryKeys.pipeline.analytics(),
    queryFn: () => fetchPipelineAnalytics(),
    staleTime: 60_000,
  });
}
