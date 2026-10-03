import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  updatePipelineDealStage,
  setDealOutcome,
  toggleChecklistItem,
  logDealFollowUp,
  claimLead,
  reassignLead,
  type PipelineDealItem,
} from '@/api/pipelineApi';

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      newStage,
      notes,
      authorInfo,
    }: {
      leadId: string | number;
      newStage: string;
      notes?: string;
      authorInfo?: { plainNote?: string; authorName?: string; authorRole?: string };
    }) => updatePipelineDealStage(leadId, newStage, notes, authorInfo),

    // Optimistic update on pipeline deals cache
    onMutate: async ({ leadId, newStage }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pipeline.deals() });
      await queryClient.cancelQueries({ queryKey: queryKeys.pipeline.kanban() });

      const prevDeals = queryClient.getQueryData<{ deals: PipelineDealItem[] }>(queryKeys.pipeline.deals());

      if (prevDeals?.deals) {
        queryClient.setQueryData(queryKeys.pipeline.deals(), {
          ...prevDeals,
          deals: prevDeals.deals.map((deal) =>
            String(deal.id) === String(leadId)
              ? { ...deal, stage: newStage, updatedAt: new Date().toISOString() }
              : deal
          ),
        });
      }

      return { prevDeals };
    },

    onError: (_err, _vars, context) => {
      if (context?.prevDeals) {
        queryClient.setQueryData(queryKeys.pipeline.deals(), context.prevDeals);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useSetDealOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      outcome,
      payload,
    }: {
      leadId: string | number;
      outcome: 'closed_lost' | 'closed_won' | 'future_followup';
      payload: { notes?: string; lossReason?: string; authorName?: string; authorRole?: string };
    }) => setDealOutcome(leadId, outcome, payload),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      itemKey,
      completed,
      stage,
    }: {
      leadId: string | number;
      itemKey: string;
      completed: boolean;
      stage?: string;
    }) => toggleChecklistItem(leadId, itemKey, completed, stage),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
    },
  });
}

export function useLogDealFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      payload,
    }: {
      leadId: string | number;
      payload: { method: string; notes: string; outcome?: string };
    }) => logDealFollowUp(leadId, payload),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
  });
}

export function useClaimLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: string | number) => claimLead(leadId),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useReassignLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      newUserId,
      notes,
    }: {
      leadId: string | number;
      newUserId: number;
      notes?: string;
    }) => reassignLead(leadId, newUserId, notes),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}
