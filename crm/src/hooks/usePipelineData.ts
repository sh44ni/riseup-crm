import { useState, useEffect, useCallback } from 'react';
import { PipelineDealItem, PipelineSummary, fetchPipelineDeals } from '@/api/pipelineApi';
import { useQueryClient } from '@tanstack/react-query';

export interface UsePipelineDataReturn {
  deals: PipelineDealItem[];
  summary: PipelineSummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  analytics: any;
  setDeals: React.Dispatch<React.SetStateAction<PipelineDealItem[]>>;
  refresh: (isSilent?: boolean) => Promise<void>;
}

export function usePipelineData(): UsePipelineDataReturn {
  const queryClient = useQueryClient();
  const [deals, setDeals] = useState<PipelineDealItem[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const loadPipelineData = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const [res, analyticsData] = await Promise.all([
        fetchPipelineDeals(),
        import('@/api/pipelineApi').then(m => m.fetchPipelineAnalytics()).catch(() => null)
      ]);
      setDeals(res.deals);
      if (res.summary) {
        setSummary(res.summary);
      }
      if (analyticsData) {
        setAnalytics(analyticsData);
      }
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err: any) {
      console.error('Failed to load real pipeline deals:', err);
      setLoadError(err.message || 'Failed to connect to backend pipeline service');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    loadPipelineData();
    const interval = setInterval(() => {
      loadPipelineData(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [loadPipelineData]);

  const refresh = useCallback(async (isSilent = false) => {
    await loadPipelineData(isSilent);
  }, [loadPipelineData]);

  return { deals, summary, isLoading, isRefreshing, loadError, analytics, setDeals, refresh };
}
