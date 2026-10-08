import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { leadsApi, type CreateLeadInput, type Lead } from '@/api/leadsApi';
import type { BackendLead } from '@/types/backendTypes';

export function useCreateLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLeadInput) => leadsApi.createLead(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: number | string; patch: Partial<BackendLead> }) =>
      leadsApi.updateLead(id, patch),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    },
  });
}

export function useUpdateLeadStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: number | string; stage: Lead['status'] }) =>
      leadsApi.updateLeadStage(id, stage),

    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.all() });
      const previousQueries = queryClient.getQueriesData<{ leads: Lead[]; total: number }>({
        queryKey: queryKeys.leads.all(),
      });

      queryClient.setQueriesData<{ leads: Lead[]; total: number }>(
        { queryKey: queryKeys.leads.all() },
        (old) => {
          if (!old?.leads) return old;
          return {
            ...old,
            leads: old.leads.map((l) =>
              String(l.id) === String(id) ? { ...l, status: stage } : l
            ),
          };
        }
      );

      return { previousQueries };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useClaimLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => leadsApi.claimLead(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.all() });
      const previousQueries = queryClient.getQueriesData<{ leads: Lead[]; total: number }>({
        queryKey: queryKeys.leads.all(),
      });

      queryClient.setQueriesData<{ leads: Lead[]; total: number }>(
        { queryKey: queryKeys.leads.all() },
        (old) => {
          if (!old?.leads) return old;
          return {
            ...old,
            leads: old.leads.map((l) =>
              String(l.id) === String(id) ? { ...l, isClaimed: true } : l
            ),
          };
        }
      );

      return { previousQueries };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useReassignLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      newUserId,
      notes,
    }: {
      id: number | string;
      newUserId: number;
      notes?: string;
    }) => leadsApi.reassignLead(id, newUserId, notes),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useMarkLeadAsLostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reason,
      lossNotes,
      authorInfo,
    }: {
      id: number | string;
      reason: string;
      lossNotes?: string;
      authorInfo?: { authorName?: string; authorRole?: string };
    }) => leadsApi.markLeadAsLost(id, reason, lossNotes, authorInfo),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useReactivateLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => leadsApi.reactivateLead(id),
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useDeleteLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => leadsApi.deleteLead(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useAddLeadActivityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      title,
      description,
      activityType = 'note',
      authorInfo,
    }: {
      leadId: number | string;
      title: string;
      description?: string;
      activityType?: string;
      authorInfo?: { authorName?: string; authorRole?: string };
    }) => leadsApi.addActivity(leadId, title, description, activityType, authorInfo),
    onSettled: (_data, _err, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.activities(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}
