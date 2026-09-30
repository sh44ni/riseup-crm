// Rise Up CRM - useLeads React Hook
// Unified TanStack Query implementation with optimistic updates, cross-view synchronization, and cache invalidation

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi, Lead, CreateLeadInput, LeadsCounts } from '@/api/leadsApi';
import { serializeProfileNote } from '@/lib/noteUtils';
import { useAuth } from '@/context/AuthContext';
import { subscribeContactUpdated, broadcastContactUpdated } from '@/utils/syncEventBus';

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

  const searchOption = options?.search;
  const categoryOption = options?.category;
  const statusOption = options?.status;

  const queryKey = ['leads', { page, perPage, search: searchOption, category: categoryOption, status: statusOption }];

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () =>
      leadsApi.listLeads({
        limit: perPage,
        offset: (page - 1) * perPage,
        search: searchOption,
        category: categoryOption,
        status: statusOption,
      }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => leadsApi.fetchLeadSources(),
    staleTime: 5 * 60 * 1000,
  });

  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (data?.leads) {
      setLeads(data.leads);
    }
  }, [data?.leads]);

  const totalCount = data?.total ?? 0;
  const counts: LeadsCounts = data?.counts || {
    all: totalCount,
    leads: 0,
    new_clients: 0,
    existing_clients: 0,
    lost_leads: 0,
  };

  const isRefreshing = isFetching && !isLoading;
  const error = queryError ? (queryError as any)?.message || 'Could not connect to CRM backend service.' : null;

  // Manual refresh helper
  const refresh = useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  }, [refetch, queryClient]);

  // Backward-compatible fetchLeads
  const fetchLeads = useCallback(async (_isSilent = false) => {
    await refetch();
  }, [refetch]);

  // Create lead
  const createLead = useCallback(
    async (payload: CreateLeadInput): Promise<Lead> => {
      try {
        const created = await leadsApi.createLead(payload);
        setLeads((prev) => [created, ...prev]);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        return created;
      } catch (err: any) {
        console.error('Error creating lead:', err);
        throw err;
      }
    },
    [queryClient]
  );

  // Advance stage
  const advanceStage = useCallback(
    async (leadId: string | number, nextStage: Lead['status']) => {
      const prevLeads = [...leads];
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: nextStage } : l))
      );

      try {
        await leadsApi.updateLeadStage(leadId, nextStage);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      } catch (err) {
        console.error('Failed to update stage on backend, rolling back:', err);
        setLeads(prevLeads);
        throw err;
      }
    },
    [leads, queryClient]
  );

  // Mark as lost
  const markAsLost = useCallback(
    async (leadId: string | number, reason: string, lossNotes?: string) => {
      const prevLeads = [...leads];
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                status: 'lost' as const,
                lossReason: reason as Lead['lossReason'],
                lossNotes: lossNotes,
                lostDate: 'Just now',
              }
            : l
        )
      );

      try {
        await leadsApi.markLeadAsLost(leadId, reason, lossNotes, {
          authorName: (user as any)?.name || 'Staff',
          authorRole: (user as any)?.role || 'Team',
        });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      } catch (err) {
        console.error('Failed to mark lead lost on backend, rolling back:', err);
        setLeads(prevLeads);
        throw err;
      }
    },
    [leads, user, queryClient]
  );

  // Reactivate lead
  const reactivateLead = useCallback(
    async (leadId: string | number) => {
      const prevLeads = [...leads];
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                status: 'contacted',
                lossReason: undefined,
                lossNotes: undefined,
                notes:
                  (l.notes ? l.notes + ' • ' : '') +
                  `Reactivated on ${new Date().toLocaleDateString()}`,
              }
            : l
        )
      );

      try {
        await leadsApi.reactivateLead(leadId);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      } catch (err) {
        console.error('Failed to reactivate lead on backend, rolling back:', err);
        setLeads(prevLeads);
        throw err;
      }
    },
    [leads, queryClient]
  );

  // Add note / activity with author profile and 12h timestamp - persists to DB permanently
  const addNote = useCallback(
    async (
      leadId: string | number,
      note: string,
      authorInfo?: { name?: string; role?: string }
    ) => {
      if (!note.trim()) return;
      const isAlreadySerialized = note.trim().startsWith('[');
      const authorName = authorInfo?.name || (user as any)?.name || 'Rise Up Team';
      const authorRole = authorInfo?.role || (user as any)?.role || 'Team';
      const formattedNote = isAlreadySerialized
        ? note.trim()
        : serializeProfileNote(note, authorName, authorRole);

      let updatedNotes = formattedNote;
      setLeads((prev) => {
        const target = prev.find((l) => String(l.id) === String(leadId));
        updatedNotes = target?.notes
          ? `${target.notes}\n\n${formattedNote}`
          : formattedNote;
        return prev.map((l) =>
          String(l.id) === String(leadId) ? { ...l, notes: updatedNotes } : l
        );
      });

      try {
        await leadsApi.updateLead(leadId, { notes: updatedNotes });
        await leadsApi.addActivity(leadId, 'General Note', note.trim(), 'note', {
          authorName,
          authorRole,
        });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      } catch (err) {
        console.error('Failed to log note activity to backend database:', err);
        throw err;
      }
    },
    [user, queryClient]
  );

  // Update contact information (persists to backend & syncs to Client 360 source of truth)
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
      // Optimistic local state update
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(leadId)
            ? {
                ...l,
                ...(contactData.name ? { name: contactData.name } : {}),
                ...(contactData.email !== undefined ? { email: contactData.email } : {}),
                ...(contactData.phone !== undefined ? { phone: contactData.phone } : {}),
                ...(contactData.address !== undefined ? { address: contactData.address } : {}),
                ...(contactData.city !== undefined ? { city: contactData.city } : {}),
                ...(contactData.zip !== undefined ? { zip: contactData.zip } : {}),
              }
            : l
        )
      );

      try {
        const res = await leadsApi.updateLead(leadId, {
          full_name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          address: contactData.address,
          city: contactData.city,
          zip: contactData.zip,
        });

        broadcastContactUpdated({
          leadId,
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          address: contactData.address,
          city: contactData.city,
          zip: contactData.zip,
        });

        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
        return res;
      } catch (err) {
        console.error('Failed to update lead contact on backend, refreshing:', err);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        throw err;
      }
    },
    [queryClient]
  );

  // Subscribe to real-time cross-view contact updates
  useEffect(() => {
    const unsubscribe = subscribeContactUpdated((detail) => {
      setLeads((prev) =>
        prev.map((l) => {
          const matchLeadId = detail.leadId && String(l.id) === String(detail.leadId);
          const matchClientId =
            detail.clientId &&
            (String((l as any).clientId) === String(detail.clientId) ||
              String((l as any).client_id) === String(detail.clientId));
          const matchEmail = Boolean(
            detail.email && l.email && l.email.toLowerCase() === detail.email.toLowerCase()
          );

          if (matchLeadId || matchClientId || matchEmail) {
            return {
              ...l,
              ...(detail.name ? { name: detail.name } : {}),
              ...(detail.email !== undefined ? { email: detail.email } : {}),
              ...(detail.phone !== undefined ? { phone: detail.phone } : {}),
              ...(detail.address !== undefined ? { address: detail.address } : {}),
              ...(detail.city !== undefined ? { city: detail.city } : {}),
              ...(detail.zip !== undefined ? { zip: detail.zip } : {}),
            };
          }
          return l;
        })
      );
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-kanban'] });
    });

    return unsubscribe;
  }, [queryClient]);

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
