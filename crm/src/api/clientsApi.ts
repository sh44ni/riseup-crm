// Rise Up CRM — Backend Clients API Client
// Interfaces with FastAPI backend at /api/admin/clients

import { httpClient } from '@/shared/api/client';

export interface ClientSummary {
  totalClients: number;
  existingClientsCount: number;
  newClientsCount: number;
  leadsCount: number;
  lostLeadsCount: number;
  activeProjects: number;
  leadCount: number;
  totalLtv: number;
}

import type { BackendClient, BackendLead, BackendJob } from '@/types/backendTypes';

export interface ClientDirectoryResponse {
  ok: boolean;
  clients: BackendClient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: ClientSummary;
}

export interface Client360ApiResponse {
  ok: boolean;
  client: BackendClient;
  leads: BackendLead[];
  inspections: unknown[];
  inspection_photos?: unknown[];
  documents?: unknown[];
  media?: unknown[];
  estimates: unknown[];
  jobs: BackendJob[];
  invoices: unknown[];
  warranties: unknown[];
  reviews: unknown[];
  activities: unknown[];
  tasks: unknown[];
}

export interface CreateClientPayload {
  fullName: string;
  phone?: string;
  email?: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  zip?: string;
  propertyType?: string;
  roofType?: string;
  roofSqf?: number;
  roofAge?: number;
  stories?: number;
  hoa?: boolean;
  notes?: string;
  assignedToUserId?: number;
  sourceType?: string;
  acquiredByUserId?: number;
  leadSourceDetail?: string;
}

export interface CreateExistingClientPayload {
  fullName: string;
  phone?: string;
  email?: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  zip?: string;
  propertyType?: string;
  roofType?: string;
  roofSqf?: number;
  roofAge?: number;
  stories?: number | string;
  hoa?: boolean;
  pipelineStage?: string;
  serviceType?: string;
  contractValue?: number;
  clientSince?: string;
  notes?: string;
  assignedToUserId?: number;
  sourceType?: string;
  acquiredByUserId?: number;
  leadSourceDetail?: string;
}

export interface ClientActivityPayload {
  title: string;
  description?: string;
  activityType?: string;
  callDuration?: number;
}

export async function fetchClients(params?: {
  search?: string;
  category?: string;
  status?: string;
  tag?: string;
  sort?: string;
  page?: number;
  sync?: boolean;
}): Promise<ClientDirectoryResponse> {
  const query: Record<string, string> = {};
  if (params?.search && params.search.trim()) query.search = params.search.trim();
  if (params?.category && params.category !== 'all') query.category = params.category;
  if (params?.status && params.status !== 'all') query.status = params.status;
  if (params?.tag && params.tag !== 'all') query.tag = params.tag;
  if (params?.sort) query.sort = params.sort;
  if (params?.page) query.page = String(params.page);
  if (params?.sync) query.sync = 'true';

  const qs = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query).toString() : '';
  return await httpClient.get<ClientDirectoryResponse>(`/admin/clients${qs}`);
}

export async function fetchClient360(clientId: number | string): Promise<Client360ApiResponse> {
  return await httpClient.get<Client360ApiResponse>(`/admin/clients/${clientId}`);
}

export async function createClient(payload: CreateClientPayload): Promise<{ ok: boolean; client: { id: number; full_name: string } }> {
  return await httpClient.post<{ ok: boolean; client: { id: number; full_name: string } }>('/admin/clients', payload);
}

export interface ExistingClientResponse {
  ok: boolean;
  client: {
    id: number;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    zip?: string | null;
    status?: string;
    client_category?: string;
    acquired_by_name?: string;
    acquired_by_role?: string;
  };
  lead?: {
    id: number;
    pipeline_stage: string;
  } | null;
  job?: {
    id: number;
    job_number: string;
  } | null;
  message?: string;
}

export async function createExistingClient(
  payload: CreateExistingClientPayload
): Promise<ExistingClientResponse> {
  return await httpClient.post<ExistingClientResponse>('/admin/clients/existing', payload);
}

export interface CheckContactResponse {
  exists: boolean;
  field?: 'email' | 'phone' | null;
  conflict_field?: 'email' | 'phone' | null;
  client?: {
    id: number;
    full_name: string;
    email: string;
    phone?: string | null;
    status: string;
  } | null;
  message?: string | null;
}

export async function checkClientContact(params: {
  email?: string;
  phone?: string;
  excludeClientId?: number | string;
}): Promise<CheckContactResponse> {
  const cleanEmail = params.email?.trim();
  const rawPhone = params.phone?.trim();
  const digits = rawPhone ? rawPhone.replace(/\D/g, '') : '';
  if ((!cleanEmail || !cleanEmail.includes('@')) && (!rawPhone || digits.length < 7)) {
    return { exists: false, client: null, message: null };
  }
  const qs = new URLSearchParams();
  if (cleanEmail && cleanEmail.includes('@')) qs.append('email', cleanEmail);
  if (rawPhone && digits.length >= 7) qs.append('phone', rawPhone);
  if (params.excludeClientId != null && !isNaN(Number(params.excludeClientId)) && Number(params.excludeClientId) > 0) {
    qs.append('exclude_client_id', String(Number(params.excludeClientId)));
  }

  try {
    return await httpClient.get<CheckContactResponse>(`/admin/clients/check-contact?${qs.toString()}`);
  } catch {
    return { exists: false, client: null, message: null };
  }
}

export type CheckEmailResponse = CheckContactResponse;
export const checkClientEmail = (email: string, excludeClientId?: number) =>
  checkClientContact({ email, excludeClientId });

export async function updateClient(clientId: number | string, payload: Record<string, unknown>): Promise<unknown> {
  return await httpClient.patch(`/admin/clients/${clientId}`, payload);
}

export async function updateClientSpecs(clientId: number | string, specs: Record<string, unknown>): Promise<unknown> {
  return await updateClient(clientId, specs);
}

export async function archiveClient(clientId: number | string): Promise<unknown> {
  return await httpClient.delete(`/admin/clients/${clientId}`);
}

export async function addClientActivity(clientId: number | string, payload: ClientActivityPayload): Promise<unknown> {
  return await httpClient.post(`/admin/clients/${clientId}/activities`, payload);
}

export async function markClientLostApi(
  clientId: number | string,
  lostReason: string,
  lostNotes?: string
): Promise<{ ok: boolean; client_id: number; leads_updated: number; lost_reason: string }> {
  return await httpClient.post<{ ok: boolean; client_id: number; leads_updated: number; lost_reason: string }>(
    `/admin/clients/${clientId}/mark-lost`,
    {
      lost_reason: lostReason,
      ...(lostNotes ? { lost_notes: lostNotes } : {}),
    }
  );
}

export async function uploadClientMedia(
  clientId: number | string,
  files: File[]
): Promise<{ ok: boolean; media: any[]; documents: any[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return await httpClient.post<{ ok: boolean; media: any[]; documents: any[] }>(
    `/admin/clients/${clientId}/media/upload`,
    formData
  );
}

export async function deleteClientMedia(
  clientId: number | string,
  mediaId: number | string
): Promise<{ ok: boolean; message: string }> {
  return await httpClient.delete<{ ok: boolean; message: string }>(
    `/admin/clients/${clientId}/media/${mediaId}`
  );
}
