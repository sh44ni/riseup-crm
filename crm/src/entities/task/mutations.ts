import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createPersonalTaskOnBackend,
  updatePersonalTaskOnBackend,
  deletePersonalTaskOnBackend,
  type PersonalTaskPayload,
} from '@/api/personalTasksApi';

export function useCreatePersonalTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: PersonalTaskPayload) => createPersonalTaskOnBackend(task),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.personal() });
    },
  });
}

export function useUpdatePersonalTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PersonalTaskPayload> }) =>
      updatePersonalTaskOnBackend(id, updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.personal() });
    },
  });
}

export function useDeletePersonalTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePersonalTaskOnBackend(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.personal() });
    },
  });
}
