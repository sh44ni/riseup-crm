import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchPersonalTasksFromBackend, type PersonalTaskPayload } from '@/api/personalTasksApi';
import { api } from '@/lib/api';

export function usePersonalTasksQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<PersonalTaskPayload[] | null>({
    queryKey: queryKeys.tasks.personal(),
    queryFn: () => fetchPersonalTasksFromBackend(),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}

export function useOperationsTasksQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<any[]>({
    queryKey: queryKeys.tasks.list(),
    queryFn: async () => {
      const json = await api.getTasks();
      const taskList = Array.isArray(json?.tasks)
        ? json.tasks
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      return taskList;
    },
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}
