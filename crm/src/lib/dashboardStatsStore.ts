// Rise Up CRM — Dashboard Stats Store
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardStats, type DashboardStats } from '../api/dashboardApi';

export function useDashboardStats() {
  const queryClient = useQueryClient();
  const { data: stats = null, isLoading, refetch } = useQuery<DashboardStats | null>({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchDashboardStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const refresh = useCallback(async (_silent = true) => {
    await refetch();
  }, [refetch]);

  const setStats = useCallback((newStats: DashboardStats | null | ((prev: DashboardStats | null) => DashboardStats | null)) => {
    queryClient.setQueryData<DashboardStats | null>(['dashboard-stats'], (old) => {
      if (typeof newStats === 'function') {
        return newStats(old ?? null);
      }
      return newStats;
    });
  }, [queryClient]);

  return { stats, setStats, isLoading, refresh };
}
