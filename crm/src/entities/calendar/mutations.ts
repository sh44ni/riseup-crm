import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createCalendarEventOnBackend,
  updateCalendarEventOnBackend,
  deleteCalendarEventOnBackend,
  toggleTaskComplete,
} from '@/api/calendarApi';
import type { TeamOperationEvent } from '@/types/calendarTypes';

export function useCreateCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (event: TeamOperationEvent) => createCalendarEventOnBackend(event),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useUpdateCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TeamOperationEvent> }) =>
      updateCalendarEventOnBackend(id, updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useToggleCalendarTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleTaskComplete(id, completed),

    // Sub-16ms instant checkmark toggle
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.all() });
      const prevEvents = queryClient.getQueryData<TeamOperationEvent[]>(queryKeys.calendar.events());

      if (prevEvents) {
        queryClient.setQueryData<TeamOperationEvent[]>(
          queryKeys.calendar.events(),
          prevEvents.map((evt) =>
            String(evt.id) === String(id)
              ? { ...evt, completed, status: completed ? 'completed' : 'scheduled' }
              : evt
          )
        );
      }

      return { prevEvents };
    },

    onError: (_err, _vars, context) => {
      if (context?.prevEvents) {
        queryClient.setQueryData(queryKeys.calendar.events(), context.prevEvents);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useDeleteCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarEventOnBackend(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}
