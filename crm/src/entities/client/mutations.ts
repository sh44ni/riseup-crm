import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createClient,
  createExistingClient,
  updateClient,
  archiveClient,
  addClientActivity,
  markClientLostApi,
  uploadClientMedia,
  deleteClientMedia,
  type CreateClientPayload,
  type CreateExistingClientPayload,
  type ClientActivityPayload,
} from '@/api/clientsApi';

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClientPayload) => createClient(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useCreateExistingClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExistingClientPayload) => createExistingClient(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
    },
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, payload }: { clientId: number | string; payload: Record<string, unknown> }) =>
      updateClient(clientId, payload),
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.profile360(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useArchiveClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number | string) => archiveClient(clientId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useAddClientActivityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number | string;
      payload: ClientActivityPayload;
    }) => addClientActivity(clientId, payload),
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.profile360(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useMarkClientLostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      lostReason,
      lostNotes,
    }: {
      clientId: number | string;
      lostReason: string;
      lostNotes?: string;
    }) => markClientLostApi(clientId, lostReason, lostNotes),
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.profile360(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useUploadClientMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      files,
    }: {
      clientId: number | string;
      files: File[];
    }) => uploadClientMedia(clientId, files),
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.profile360(clientId) });
    },
  });
}

export function useDeleteClientMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      mediaId,
    }: {
      clientId: number | string;
      mediaId: number | string;
    }) => deleteClientMedia(clientId, mediaId),
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.profile360(clientId) });
    },
  });
}
