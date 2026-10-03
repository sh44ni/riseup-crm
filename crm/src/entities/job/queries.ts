import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJobs, fetchJob, fetchJobActivities } from '@/api/jobsApi';

export interface UseJobsListParams {
  status?: string;
  search?: string;
}

export function useJobsListQuery(
  params?: UseJobsListParams,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: queryKeys.jobs.list(params as Record<string, unknown> | undefined),
    queryFn: () => fetchJobs(params),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}

export function useJobDetailQuery(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => fetchJob(id),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(id),
    staleTime: 30_000,
  });
}

export function useJobActivitiesQuery(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.jobs.activities(id),
    queryFn: () => fetchJobActivities(id),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(id),
    staleTime: 15_000,
  });
}
