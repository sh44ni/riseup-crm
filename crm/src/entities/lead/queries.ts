import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { leadsApi } from '@/api/leadsApi';

export interface UseLeadsListParams {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  status?: string;
}

export function useLeadsListQuery(
  params?: UseLeadsListParams,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: queryKeys.leads.list(params as Record<string, unknown> | undefined),
    queryFn: () => leadsApi.listLeads(params),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}

export function useLeadDetailQuery(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadsApi.getLead(id),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(id),
    staleTime: 30_000,
  });
}

export function useLeadActivitiesQuery(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.leads.activities(id),
    queryFn: () => leadsApi.getActivities(id),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(id),
    staleTime: 15_000,
  });
}

export function useLeadSourcesQuery() {
  return useQuery({
    queryKey: ['lead-sources'] as const,
    queryFn: () => leadsApi.fetchLeadSources(),
    staleTime: 5 * 60 * 1000,
  });
}
