import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchCalendarEventsFromBackend,
  fetchCalendarStats,
  fetchCalendarWeather,
  fetchRegisteredUsers,
  fetchPipelineJobs,
  fetchRealJobs,
} from '@/api/calendarApi';
import type { TeamOperationEvent } from '@/types/calendarTypes';

export interface UseCalendarEventsParams {
  startDate?: string;
  endDate?: string;
  assignedToUserId?: string | number;
  category?: string;
  status?: string;
}

export function useCalendarEventsQuery(
  params?: UseCalendarEventsParams,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<TeamOperationEvent[] | null>({
    queryKey: queryKeys.calendar.events(params as Record<string, unknown> | undefined),
    queryFn: () => fetchCalendarEventsFromBackend(params),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}

export function useCalendarStatsQuery() {
  return useQuery({
    queryKey: ['calendar', 'stats'] as const,
    queryFn: () => fetchCalendarStats(),
    staleTime: 30_000,
  });
}

export function useCalendarWeatherQuery() {
  return useQuery({
    queryKey: ['calendar', 'weather'] as const,
    queryFn: () => fetchCalendarWeather(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegisteredUsersQuery() {
  return useQuery({
    queryKey: ['system', 'registered-users'] as const,
    queryFn: () => fetchRegisteredUsers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineJobsQuery() {
  return useQuery({
    queryKey: ['system', 'pipeline-jobs'] as const,
    queryFn: () => fetchPipelineJobs(),
    staleTime: 60_000,
  });
}

export function useRealJobsQuery() {
  return useQuery({
    queryKey: ['system', 'real-jobs'] as const,
    queryFn: () => fetchRealJobs(),
    staleTime: 60_000,
  });
}
