import type { BackendClient } from '@/types/backendTypes';
// Rise Up CRM — useClients React Hook
// Manages real-time client state, directory list, 360 profile caching, and backend mutations

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchClients,
  fetchClient360,
  updateClientSpecs,
  updateClient,
  addClientActivity,
  markClientLostApi,
  createClient,
  createExistingClient,
  
  ClientSummary,
  CreateClientPayload,
  CreateExistingClientPayload,
} from '@/api/clientsApi';
import {
  backendClientToClient360,
  roofSpecsToBackendPayload,
} from '@/lib/clientAdapter';
import { Client360Record, RoofSpecs, TimelineEvent } from '@/types/client360Types';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { broadcastContactUpdated, subscribeContactUpdated, ContactUpdatedDetail } from '@/utils/syncEventBus';

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client360Record[]>([]);
  const [rawClients, setRawClients] = useState<BackendClient[]>([]);
  const [summary, setSummary] = useState<ClientSummary | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeClientDetail, setActiveClientDetail] = useState<Client360Record | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch directory list
  const loadClients = useCallback(
    async (params?: {
      search?: string;
      category?: string;
      status?: string;
      tag?: string;
      sort?: string;
      page?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchClients(params);
        if (isMountedRef.current) {
          setRawClients(res.clients);
          const adapted = res.clients.map((c) => backendClientToClient360(c));
          setClients(adapted);
          setSummary(res.summary);
          setTotal(res.total);
          setPage(res.page);
          setTotalPages(res.totalPages);

          // Auto-select first client if none selected
          if (adapted.length > 0) {
            setSelectedClientId((prev) => (prev ? prev : adapted[0].id));
          }
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          console.error('Failed to load clients from backend:', err);
          setError(err?.message || 'Failed to load clients');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Load 360 Detail when a client is selected
  const loadClient360Detail = useCallback(
    async (clientId: string | number) => {
      const numericId = typeof clientId === 'string' ? parseInt(clientId.replace(/\D/g, '')) || Number(clientId) : clientId;
      if (!numericId || isNaN(numericId)) return;

      setDetailLoading(true);
      try {
        const detailRes = await fetchClient360(numericId);
        if (isMountedRef.current && detailRes?.client) {
          const fullyEnriched = backendClientToClient360(detailRes.client, detailRes);
          setActiveClientDetail(fullyEnriched);
          // Also update the item in the list
          setClients((prev) =>
            prev.map((c) => (String(c.id) === String(numericId) ? fullyEnriched : c))
          );
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          console.error(`Failed to load client 360 detail for ID ${numericId}:`, err);
        }
      } finally {
        if (isMountedRef.current) {
          setDetailLoading(false);
        }
      }
    },
    []
  );

  // When selectedClientId changes, trigger detail fetch
  useEffect(() => {
    if (selectedClientId) {
      loadClient360Detail(selectedClientId);
    }
  }, [selectedClientId, loadClient360Detail]);

  // Listen for cross-view contact updates (e.g. from Lead views or Pipeline)
  useEffect(() => {
    const unsubscribe = subscribeContactUpdated((detail) => {
      if (detail.source === 'client_360') return; // Avoid self-loop

      const targetId = detail.clientId ? String(detail.clientId) : null;
      if (!targetId) {
        loadClients();
        return;
      }

      setClients((prev) =>
        prev.map((c) => {
          if (String(c.id) === targetId) {
            return {
              ...c,
              ...(detail.full_name ? { name: detail.full_name } : {}),
              ...(detail.email !== undefined ? { email: detail.email } : {}),
              ...(detail.phone !== undefined ? { phone: detail.phone } : {}),
              ...(detail.address !== undefined ? { address: detail.address } : {}),
              ...(detail.city !== undefined ? { city: detail.city } : {}),
              ...(detail.zip !== undefined ? { zip: detail.zip } : {}),
              roofSpecs: {
                ...c.roofSpecs,
                ...(detail.address !== undefined ? { address: detail.address } : {}),
                ...(detail.city !== undefined || detail.zip !== undefined
                  ? { cityZip: `${detail.city || c.city} ${detail.zip || c.zip}`.trim() }
                  : {}),
              },
            };
          }
          return c;
        })
      );

      if (activeClientDetail && String(activeClientDetail.id) === targetId) {
        setActiveClientDetail((prev) =>
          prev
            ? {
                ...prev,
                ...(detail.full_name ? { name: detail.full_name } : {}),
                ...(detail.email !== undefined ? { email: detail.email } : {}),
                ...(detail.phone !== undefined ? { phone: detail.phone } : {}),
                ...(detail.address !== undefined ? { address: detail.address } : {}),
                ...(detail.city !== undefined ? { city: detail.city } : {}),
                ...(detail.zip !== undefined ? { zip: detail.zip } : {}),
                roofSpecs: {
                  ...prev.roofSpecs,
                  ...(detail.address !== undefined ? { address: detail.address } : {}),
                  ...(detail.city !== undefined || detail.zip !== undefined
                    ? { cityZip: `${detail.city || prev.city} ${detail.zip || prev.zip}`.trim() }
                    : {}),
                },
              }
            : null
        );
      }
    });

    return () => unsubscribe();
  }, [activeClientDetail, loadClients]);

  // Handler: Select client
  const selectClient = useCallback((id: string) => {
    setSelectedClientId(id);
  }, []);

  // Handler: Update Client Contact Info (Client 360 as Source of Truth)
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
      const numericId = typeof clientId === 'string' ? parseInt(clientId.replace(/\D/g, '')) || Number(clientId) : clientId;

      // Optimistic update
      setClients((prev) =>
        prev.map((c) => {
          if (String(c.id) === String(clientId)) {
            return {
              ...c,
              ...(contact.name ? { name: contact.name } : {}),
              ...(contact.email !== undefined ? { email: contact.email } : {}),
              ...(contact.phone !== undefined ? { phone: contact.phone } : {}),
              ...(contact.address !== undefined ? { address: contact.address } : {}),
              ...(contact.city !== undefined ? { city: contact.city } : {}),
              ...(contact.zip !== undefined ? { zip: contact.zip } : {}),
              roofSpecs: {
                ...c.roofSpecs,
                ...(contact.address !== undefined ? { address: contact.address } : {}),
                ...(contact.city !== undefined || contact.zip !== undefined
                  ? { cityZip: `${contact.city || c.city} ${contact.zip || c.zip}`.trim() }
                  : {}),
              },
            };
          }
          return c;
        })
      );

      if (activeClientDetail && String(activeClientDetail.id) === String(clientId)) {
        setActiveClientDetail((prev) =>
          prev
            ? {
                ...prev,
                ...(contact.name ? { name: contact.name } : {}),
                ...(contact.email !== undefined ? { email: contact.email } : {}),
                ...(contact.phone !== undefined ? { phone: contact.phone } : {}),
                ...(contact.address !== undefined ? { address: contact.address } : {}),
                ...(contact.city !== undefined ? { city: contact.city } : {}),
                ...(contact.zip !== undefined ? { zip: contact.zip } : {}),
                roofSpecs: {
                  ...prev.roofSpecs,
                  ...(contact.address !== undefined ? { address: contact.address } : {}),
                  ...(contact.city !== undefined || contact.zip !== undefined
                    ? { cityZip: `${contact.city || prev.city} ${contact.zip || prev.zip}`.trim() }
                    : {}),
                },
              }
            : null
        );
      }

      const payload: Record<string, any> = {};
      if (contact.name !== undefined) payload.full_name = contact.name;
      if (contact.email !== undefined) payload.email = contact.email;
      if (contact.phone !== undefined) payload.phone = contact.phone;
      if (contact.address !== undefined) payload.address = contact.address;
      if (contact.city !== undefined) payload.city = contact.city;
      if (contact.zip !== undefined) payload.zip = contact.zip;

      try {
        const res = await updateClient(numericId, payload);
        broadcastContactUpdated({
          clientId: numericId,
          full_name: contact.name,
          email: contact.email,
          phone: contact.phone,
          address: contact.address,
          city: contact.city,
          zip: contact.zip,
          source: 'client_360',
        });
        loadClient360Detail(numericId);
        return res;
      } catch (err: any) {
        console.error('Failed to update client contact info on backend:', err);
        throw err;
      }
    },
    [activeClientDetail, loadClient360Detail]
  );

  // Handler: Save roof specs
  const saveSpecs = useCallback(
    async (clientId: string | number, updatedSpecs: RoofSpecs) => {
      const numericId = typeof clientId === 'string' ? parseInt(clientId.replace(/\D/g, '')) || Number(clientId) : clientId;
      const payload = roofSpecsToBackendPayload(updatedSpecs);

      // Optimistic update
      setClients((prev) =>
        prev.map((c) => {
          if (String(c.id) === String(clientId)) {
            return {
              ...c,
              roofSpecs: updatedSpecs,
              address: updatedSpecs.address,
              city: updatedSpecs.cityZip.split(' ')[0] || c.city,
            };
          }
          return c;
        })
      );

      if (activeClientDetail && String(activeClientDetail.id) === String(clientId)) {
        setActiveClientDetail((prev) =>
          prev
            ? {
                ...prev,
                roofSpecs: updatedSpecs,
                address: updatedSpecs.address,
                city: updatedSpecs.cityZip.split(' ')[0] || prev.city,
              }
            : null
        );
      }

      try {
        await updateClientSpecs(numericId, payload);
        // Refresh detail in background
        loadClient360Detail(numericId);
      } catch (err: any) {
        console.error('Failed to update client specs on backend:', err);
        throw err;
      }
    },
    [activeClientDetail, loadClient360Detail]
  );

  // Handler: Log activity
  const logActivity = useCallback(
    async (clientId: string | number, newEvent: Omit<TimelineEvent, 'id'>) => {
      const numericId = typeof clientId === 'string' ? parseInt(clientId.replace(/\D/g, '')) || Number(clientId) : clientId;

      const fullEvent: TimelineEvent = {
        ...newEvent,
        id: `ev-temp-${Date.now()}`,
      };

      // Optimistic update
      setClients((prev) =>
        prev.map((c) => {
          if (String(c.id) === String(clientId)) {
            return {
              ...c,
              timeline: [fullEvent, ...c.timeline],
            };
          }
          return c;
        })
      );

      if (activeClientDetail && String(activeClientDetail.id) === String(clientId)) {
        setActiveClientDetail((prev) =>
          prev
            ? {
                ...prev,
                timeline: [fullEvent, ...prev.timeline],
              }
            : null
        );
      }

      try {
        await addClientActivity(numericId, {
          title: newEvent.title,
          description: newEvent.details,
          activityType: newEvent.type,
        });
        loadClient360Detail(numericId);
      } catch (err: any) {
        console.error('Failed to save client activity on backend:', err);
        throw err;
      }
    },
    [activeClientDetail, loadClient360Detail]
  );

  // Handler: Reactivate deal
  const reactivateClient = useCallback(
    async (clientId: string | number) => {
      const numericId = typeof clientId === 'string' ? parseInt(clientId.replace(/\D/g, '')) || Number(clientId) : clientId;

      try {
        await updateClient(numericId, {
          status: 'active_job',
          client_category: 'existing_client',
        });
        await addClientActivity(numericId, {
          title: 'Deal Reactivated from Closed Lost Archive',
          description: 'Client reactivated to active pipeline by staff.',
          activityType: 'system',
        });
        await loadClients();
        loadClient360Detail(numericId);
      } catch (err: any) {
        console.error('Failed to reactivate client on backend:', err);
        throw err;
      }
    },
    [loadClients, loadClient360Detail]
  );

  // Handler: Create client
  const createNewClient = useCallback(
    async (payload: CreateClientPayload) => {
      try {
        const res = await createClient(payload);
        await loadClients();
        if (res?.client?.id) {
          setSelectedClientId(String(res.client.id));
        }
        return res;
      } catch (err: any) {
        console.error('Failed to create new client on backend:', err);
        throw err;
      }
    },
    [loadClients]
  );

  // Handler: Onboard existing client at any pipeline stage
  const createExistingHomeowner = useCallback(
    async (payload: CreateExistingClientPayload) => {
      try {
        const res = await createExistingClient(payload);
        await loadClients();
        if (res?.client?.id) {
          setSelectedClientId(String(res.client.id));
          loadClient360Detail(res.client.id);
        }
        broadcastContactUpdated({
          clientId: res?.client?.id,
          leadId: res?.lead?.id,
          name: res?.client?.full_name || payload.fullName,
          phone: res?.client?.phone || payload.phone || undefined,
          email: res?.client?.email || payload.email || undefined,
          address: res?.client?.address || payload.address || undefined,
          city: res?.client?.city || payload.city || undefined,
          zip: res?.client?.zip || payload.zip || undefined,
        });
        return res;
      } catch (err: any) {
        console.error('Failed to onboard existing homeowner:', err);
        throw err;
      }
    },
    [loadClients, loadClient360Detail]
  );

  // Handler: Tasks
  const fetchClientTasks = useCallback(async (clientId: string | number) => {
    return api.request(`/admin/clients/${clientId}/tasks`);
  }, []);

  const createClientTask = useCallback(async (clientId: string | number, task: any) => {
    return api.request(`/admin/clients/${clientId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }, []);

  const toggleClientTask = useCallback(async (clientId: string | number, taskId: string | number) => {
    return api.request(`/admin/clients/${clientId}/tasks/${taskId}`, {
      method: 'PUT',
    });
  }, []);

  // Handler: Documents
  const fetchDocuments = useCallback(async (clientId: string | number) => {
    return api.request(`/admin/clients/${clientId}/documents`);
  }, []);

  const uploadDocument = useCallback(async (clientId: string | number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.request(`/admin/clients/${clientId}/documents`, {
      method: 'POST',
      body: formData,
    });
  }, []);

  const deleteDocument = useCallback(async (clientId: string | number, documentId: string | number) => {
    return api.request(`/admin/clients/${clientId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }, []);

  // Selected client object fallback
  const currentClient =
    (activeClientDetail && String(activeClientDetail.id) === String(selectedClientId)
      ? activeClientDetail
      : clients.find((c) => String(c.id) === String(selectedClientId))) || clients[0];

  // Handler: Mark client as lost
  const markClientAsLost = useCallback(
    async (clientId: string | number, reason: string, lossNotes?: string) => {
      const numericId =
        typeof clientId === 'string'
          ? parseInt(clientId.replace(/\D/g, '')) || Number(clientId)
          : clientId;

      try {
        // Single atomic call — backend handles client_category + linked leads + activity log
        await markClientLostApi(numericId, reason, lossNotes);
        await loadClients();
        await loadClient360Detail(numericId);
      } catch (err: any) {
        console.error('Failed to mark client as lost:', err);
        throw err;
      }
    },
    [loadClients, loadClient360Detail]
  );

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


