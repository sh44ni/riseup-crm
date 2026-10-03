import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchPersonalTasksFromBackend, type PersonalTaskPayload } from '@/api/personalTasksApi';

export function usePersonalTasksQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<PersonalTaskPayload[] | null>({
    queryKey: queryKeys.tasks.personal(),
    queryFn: () => fetchPersonalTasksFromBackend(),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}
