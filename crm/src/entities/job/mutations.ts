import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createJob,
  updateJob,
  completeJob,
  logJobActivity,
  type CreateJobPayload,
} from '@/api/jobsApi';
import type { JobMilestone } from '@/types/jobTypes';

export function useCreateJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateJobPayload) => createJob(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    },
  });
}

export function useUpdateJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Record<string, unknown> }) =>
      updateJob(id, payload),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useUpdateJobMilestonesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, milestones }: { id: number | string; milestones: JobMilestone[] }) =>
      updateJob(id, { milestones }),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useCompleteJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => completeJob(id),
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useAddJobActivityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | string;
      payload: { note: string; authorName?: string; authorRole?: string };
    }) => logJobActivity(id, payload),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.activities(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}
