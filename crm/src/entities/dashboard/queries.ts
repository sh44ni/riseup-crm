import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchDashboardStats, type DashboardStats } from '@/api/dashboardApi';

export function useDashboardStatsQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<DashboardStats | null>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => fetchDashboardStats(),
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? 30_000,
    enabled: options?.enabled,
  });
}
