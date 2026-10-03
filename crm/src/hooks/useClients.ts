// Rise Up CRM — useClients React Hook
// Modernized TanStack Query implementation backed by entities/client

import { useState, useCallback, useMemo } from 'react';
import type { BackendClient } from '@/types/backendTypes';
import {
  ClientSummary,
  CreateClientPayload,
  CreateExistingClientPayload,
  updateClientSpecs,
} from '@/api/clientsApi';
import {
  backendClientToClient360,
  roofSpecsToBackendPayload,
} from '@/lib/clientAdapter';
import { Client360Record, RoofSpecs, TimelineEvent } from '@/types/client360Types';
import { httpClient } from '@/shared/api/client';
import { useClientsListQuery, useClient360Query } from '@/entities/client/queries';
import {
  useCreateClientMutation,
  useCreateExistingClientMutation,
  useUpdateClientMutation,
  useAddClientActivityMutation,
  useMarkClientLostMutation,
} from '@/entities/client/mutations';

export interface UseClientsOptions {
  search?: string;
  category?: string;
  status?: string;
  tag?: string;
  sort?: string;
  page?: number;
}

export function useClients() {
  const [params, setParams] = useState<UseClientsOptions>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data, isLoading: loading, error: queryError, refetch } = useClientsListQuery(params);

  const numericSelectedId = useMemo(() => {
    if (!selectedClientId) return undefined;
    const n = parseInt(selectedClientId.replace(/\D/g, ''), 10);
    return isNaN(n) ? undefined : n;
  }, [selectedClientId]);

  const { data: detailData, isLoading: detailLoading } = useClient360Query(
    numericSelectedId || '',
    { enabled: Boolean(numericSelectedId) }
  );

  const createClientMutation = useCreateClientMutation();
  const createExistingMutation = useCreateExistingClientMutation();
  const updateClientMutation = useUpdateClientMutation();
  const addActivityMutation = useAddClientActivityMutation();
  const markLostMutation = useMarkClientLostMutation();

  const rawClients: BackendClient[] = useMemo(() => data?.clients || [], [data?.clients]);

  const clients: Client360Record[] = useMemo(() => {
    return rawClients.map((c) => backendClientToClient360(c));
  }, [rawClients]);

  const summary: ClientSummary | null = data?.summary || null;
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load clients') : null;

  const activeClientDetail: Client360Record | null = useMemo(() => {
    if (!detailData?.client) return null;
    return backendClientToClient360(detailData.client, detailData);
  }, [detailData]);

  // Selected client fallback
  const currentClient = useMemo(() => {
    if (activeClientDetail && String(activeClientDetail.id) === String(selectedClientId)) {
      return activeClientDetail;
    }
    return clients.find((c) => String(c.id) === String(selectedClientId)) || clients[0];
  }, [activeClientDetail, selectedClientId, clients]);

  const loadClients = useCallback(async (newParams?: UseClientsOptions) => {
    if (newParams) setParams(newParams);
    await refetch();
  }, [refetch]);

  const selectClient = useCallback((id: string) => {
    setSelectedClientId(id);
  }, []);

  const updateContact = useCallback(
    async (
      clientId: string | number,
      contact: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        zip?: string;
      }
    ) => {
      const payload: Record<string, unknown> = {};
      if (contact.name !== undefined) payload.full_name = contact.name;
      if (contact.email !== undefined) payload.email = contact.email;
      if (contact.phone !== undefined) payload.phone = contact.phone;
      if (contact.address !== undefined) payload.address = contact.address;
      if (contact.city !== undefined) payload.city = contact.city;
      if (contact.zip !== undefined) payload.zip = contact.zip;

      return await updateClientMutation.mutateAsync({ clientId, payload });
    },
    [updateClientMutation]
  );

  const saveSpecs = useCallback(
    async (clientId: string | number, updatedSpecs: RoofSpecs) => {
      const payload = roofSpecsToBackendPayload(updatedSpecs);
      await updateClientSpecs(clientId, payload);
      await updateClientMutation.mutateAsync({ clientId, payload });
    },
    [updateClientMutation]
  );

  const logActivity = useCallback(
    async (clientId: string | number, newEvent: Omit<TimelineEvent, 'id'>) => {
      await addActivityMutation.mutateAsync({
        clientId,
        payload: {
          title: newEvent.title,
          description: newEvent.details,
          activityType: newEvent.type,
        },
      });
    },
    [addActivityMutation]
  );

  const reactivateClient = useCallback(
    async (clientId: string | number) => {
      await updateClientMutation.mutateAsync({
        clientId,
        payload: {
          status: 'active_job',
          client_category: 'existing_client',
        },
      });
      await addActivityMutation.mutateAsync({
        clientId,
        payload: {
          title: 'Deal Reactivated from Closed Lost Archive',
          description: 'Client reactivated to active pipeline by staff.',
          activityType: 'system',
        },
      });
    },
    [updateClientMutation, addActivityMutation]
  );

  const createNewClient = useCallback(
    async (payload: CreateClientPayload) => {
      const res = await createClientMutation.mutateAsync(payload);
      if (res?.client?.id) {
        setSelectedClientId(String(res.client.id));
      }
      return res;
    },
    [createClientMutation]
  );

  const createExistingHomeowner = useCallback(
    async (payload: CreateExistingClientPayload) => {
      const res = await createExistingMutation.mutateAsync(payload);
      if (res?.client?.id) {
        setSelectedClientId(String(res.client.id));
      }
      return res;
    },
    [createExistingMutation]
  );

  const markClientAsLost = useCallback(
    async (clientId: string | number, reason: string, lossNotes?: string) => {
      await markLostMutation.mutateAsync({ clientId, lostReason: reason, lostNotes: lossNotes });
    },
    [markLostMutation]
  );

  const setClients = useCallback((_action: React.SetStateAction<Client360Record[]>) => {
    // TanStack Query handles caching; no-op for backward compatibility
  }, []);

  // Document & Task helpers using httpClient
  const fetchClientTasks = useCallback(async (clientId: string | number) => {
    return httpClient.get(`/admin/clients/${clientId}/tasks`);
  }, []);

  const createClientTask = useCallback(async (clientId: string | number, task: unknown) => {
    return httpClient.post(`/admin/clients/${clientId}/tasks`, task);
  }, []);

  const toggleClientTask = useCallback(async (clientId: string | number, taskId: string | number) => {
    return httpClient.put(`/admin/clients/${clientId}/tasks/${taskId}`, {});
  }, []);

  const fetchDocuments = useCallback(async (clientId: string | number) => {
    return httpClient.get(`/admin/clients/${clientId}/documents`);
  }, []);

  const uploadDocument = useCallback(async (clientId: string | number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return httpClient.post(`/admin/clients/${clientId}/documents`, formData);
  }, []);

  const deleteDocument = useCallback(async (clientId: string | number, documentId: string | number) => {
    return httpClient.delete(`/admin/clients/${clientId}/documents/${documentId}`);
  }, []);

  return {
    clients,
    setClients,
    rawClients,
    summary,
    selectedClientId,
    setSelectedClientId,
    currentClient,
    loading,
    detailLoading,
    error,
    total,
    page,
    totalPages,
    loadClients,
    selectClient,
    saveSpecs,
    updateContact,
    logActivity,
    reactivateClient,
    markClientAsLost,
    createNewClient,
    createExistingHomeowner,
    refetch: loadClients,
    fetchClientTasks,
    createClientTask,
    toggleClientTask,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  };
}
