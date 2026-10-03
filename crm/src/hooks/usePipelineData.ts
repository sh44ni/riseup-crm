import { useCallback } from 'react';
import { PipelineDealItem, PipelineSummary, PipelineAnalyticsData } from '@/api/pipelineApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { usePipelineDealsQuery, usePipelineAnalyticsQuery } from '@/entities/pipeline/queries';

export interface UsePipelineDataReturn {
  deals: PipelineDealItem[];
  summary: PipelineSummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  analytics: PipelineAnalyticsData | null;
  setDeals: React.Dispatch<React.SetStateAction<PipelineDealItem[]>>;
  refresh: (isSilent?: boolean) => Promise<void>;
}

export function usePipelineData(): UsePipelineDataReturn {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = usePipelineDealsQuery();
  const { data: analyticsData } = usePipelineAnalyticsQuery();

  const deals = data?.deals || [];
  const summary = data?.summary || null;
  const isRefreshing = isFetching && !isLoading;
  const loadError = error ? (error instanceof Error ? error.message : 'Failed to connect to backend pipeline service') : null;

  const setDeals = useCallback(
    (action: React.SetStateAction<PipelineDealItem[]>) => {
      queryClient.setQueryData<{ deals: PipelineDealItem[]; summary?: PipelineSummary }>(
        queryKeys.pipeline.deals(),
        (prev) => {
          const currentDeals = prev?.deals || [];
          const nextDeals = typeof action === 'function' ? action(currentDeals) : action;
          return {
            deals: nextDeals,
            summary: prev?.summary,
          };
        }
      );
    },
    [queryClient]
  );

  const refresh = useCallback(
    async (_isSilent = false) => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
    [refetch, queryClient]
  );

  return {
    deals,
    summary,
    isLoading,
    isRefreshing,
    loadError,
    analytics: analyticsData ?? null,
    setDeals,
    refresh,
  };
}
