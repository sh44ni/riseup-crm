// Rise Up CRM - useLeads React Hook
// Modernized TanStack Query implementation backed by entities/lead

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lead, CreateLeadInput, LeadsCounts } from '@/api/leadsApi';
import { queryKeys } from '@/lib/queryKeys';
import { serializeProfileNote } from '@/lib/noteUtils';
import { useAuth } from '@/context/AuthContext';
import { useLeadsListQuery, useLeadSourcesQuery } from '@/entities/lead/queries';
import {
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadStageMutation,
  useMarkLeadAsLostMutation,
  useReactivateLeadMutation,
  useAddLeadActivityMutation,
} from '@/entities/lead/mutations';

export interface UseLeadsOptions {
  search?: string;
  category?: string;
  status?: string;
}

export function useLeads(options?: UseLeadsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(50);

  const queryParams = useMemo(
    () => ({
      limit: perPage,
      offset: (page - 1) * perPage,
      search: options?.search,
      category: options?.category,
      status: options?.status,
    }),
    [perPage, page, options?.search, options?.category, options?.status]
  );

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useLeadsListQuery(queryParams);

  const { data: sources = [] } = useLeadSourcesQuery();

  const createLeadMutation = useCreateLeadMutation();
  const updateLeadMutation = useUpdateLeadMutation();
  const updateStageMutation = useUpdateLeadStageMutation();
  const markLostMutation = useMarkLeadAsLostMutation();
  const reactivateMutation = useReactivateLeadMutation();
  const addActivityMutation = useAddLeadActivityMutation();

  const leads = useMemo(() => data?.leads || [], [data?.leads]);
  const totalCount = data?.total ?? 0;
  const counts: LeadsCounts = data?.counts || {
    all: totalCount,
    leads: 0,
    new_clients: 0,
    existing_clients: 0,
    lost_leads: 0,
  };

  const isRefreshing = isFetching && !isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Could not connect to CRM backend service.') : null;

  const setLeads = useCallback(
    (action: React.SetStateAction<Lead[]>) => {
      queryClient.setQueryData<{ leads: Lead[]; total: number; counts: LeadsCounts }>(
        queryKeys.leads.list(queryParams as Record<string, unknown>),
        (prev) => {
          if (!prev) return prev as unknown as { leads: Lead[]; total: number; counts: LeadsCounts };
          const nextLeads = typeof action === 'function' ? action(prev.leads) : action;
          return {
            ...prev,
            leads: nextLeads,
          };
        }
      );
    },
    [queryClient, queryParams]
  );

  const refresh = useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  }, [refetch, queryClient]);

  const fetchLeads = useCallback(
    async (_isSilent = false) => {
      await refetch();
    },
    [refetch]
  );

  const createLead = useCallback(
    async (payload: CreateLeadInput): Promise<Lead> => {
      return await createLeadMutation.mutateAsync(payload);
    },
    [createLeadMutation]
  );

  const advanceStage = useCallback(
    async (leadId: string | number, nextStage: Lead['status']) => {
      await updateStageMutation.mutateAsync({ id: leadId, stage: nextStage });
    },
    [updateStageMutation]
  );

  const markAsLost = useCallback(
    async (leadId: string | number, reason: string, lossNotes?: string) => {
      await markLostMutation.mutateAsync({
        id: leadId,
        reason,
        lossNotes,
        authorInfo: {
          authorName: user?.name || 'Staff',
          authorRole: user?.role || 'Team',
        },
      });
    },
    [markLostMutation, user]
  );

  const reactivateLead = useCallback(
    async (leadId: string | number) => {
      await reactivateMutation.mutateAsync(leadId);
    },
    [reactivateMutation]
  );

  const addNote = useCallback(
    async (
      leadId: string | number,
      note: string,
      authorInfo?: { name?: string; role?: string }
    ) => {
      if (!note.trim()) return;
      const isAlreadySerialized = note.trim().startsWith('[');
      const authorName = authorInfo?.name || user?.name || 'Rise Up Team';
      const authorRole = authorInfo?.role || user?.role || 'Team';
      const formattedNote = isAlreadySerialized
        ? note.trim()
        : serializeProfileNote(note, authorName, authorRole);

      const target = leads.find((l) => String(l.id) === String(leadId));
      const updatedNotes = target?.notes
        ? `${target.notes}\n\n${formattedNote}`
        : formattedNote;

      await updateLeadMutation.mutateAsync({
        id: leadId,
        patch: { notes: updatedNotes },
      });
      await addActivityMutation.mutateAsync({
        leadId,
        title: 'General Note',
        description: note.trim(),
        activityType: 'note',
        authorInfo: { authorName, authorRole },
      });
    },
    [user, leads, updateLeadMutation, addActivityMutation]
  );

  const updateLeadContact = useCallback(
    async (
      leadId: string | number,
      contactData: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        zip?: string;
      }
    ) => {
      return await updateLeadMutation.mutateAsync({
        id: leadId,
        patch: {
          full_name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          address: contactData.address,
          city: contactData.city,
          zip: contactData.zip,
        },
      });
    },
    [updateLeadMutation]
  );

  return {
    leads,
    setLeads,
    totalCount,
    counts,
    isLoading,
    isRefreshing,
    error,
    refresh,
    fetchLeads,
    createLead,
    advanceStage,
    markAsLost,
    reactivateLead,
    addNote,
    updateLeadContact,
    page,
    setPage,
    perPage,
    sources,
  };
}
