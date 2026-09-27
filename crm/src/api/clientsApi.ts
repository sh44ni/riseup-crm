// Rise Up CRM — Backend Clients API Client
// Interfaces with FastAPI backend at /api/admin/clients

import { api, API_ORIGIN } from '@/lib/api';

const BASE = API_ORIGIN;

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

import type { BackendClient } from '@/types/backendTypes';

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
  leads: any[];
  inspections: any[];
  inspection_photos?: any[];
  documents?: any[];
  estimates: any[];
  jobs: any[];
  invoices: any[];
  warranties: any[];
  reviews: any[];
  activities: any[];
  tasks: any[];
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
  const res = await fetch(`${BASE}/api/admin/clients${qs}`, {
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch clients' }));
    throw new Error(err?.detail || `Failed to fetch clients: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function fetchClient360(clientId: number | string): Promise<Client360ApiResponse> {
  const res = await fetch(`${BASE}/api/admin/clients/${clientId}`, {
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch client 360 profile' }));
    throw new Error(err?.detail || `Failed to fetch client 360: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function createClient(payload: CreateClientPayload): Promise<{ ok: boolean; client: { id: number; full_name: string } }> {
  const res = await fetch(`${BASE}/api/admin/clients`, {
    method: 'POST',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create client' }));
    throw new Error(err?.detail || `Client creation failed: HTTP ${res.status}`);
  }

  return await res.json();
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
  const res = await fetch(`${BASE}/api/admin/clients/existing`, {
    method: 'POST',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to onboard existing client' }));
    throw new Error(err?.detail || `Existing client onboarding failed: HTTP ${res.status}`);
  }

  return await res.json();
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
  excludeClientId?: number;
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
  if (params.excludeClientId) qs.append('exclude_client_id', String(params.excludeClientId));

  const res = await fetch(`${BASE}/api/admin/clients/check-contact?${qs.toString()}`, {
    headers: api.getAuthHeaders(),
  });
  if (!res.ok) {
    return { exists: false, client: null, message: null };
  }
  return await res.json();
}

export type CheckEmailResponse = CheckContactResponse;
export const checkClientEmail = (email: string, excludeClientId?: number) =>
  checkClientContact({ email, excludeClientId });

export async function updateClient(clientId: number | string, payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE}/api/admin/clients/${clientId}`, {
    method: 'PATCH',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update client' }));
    throw new Error(err?.detail || `Client update failed: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function updateClientSpecs(clientId: number | string, specs: Record<string, any>): Promise<any> {
  return await updateClient(clientId, specs);
}

export async function archiveClient(clientId: number | string): Promise<any> {
  const res = await fetch(`${BASE}/api/admin/clients/${clientId}`, {
    method: 'DELETE',
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to archive client' }));
    throw new Error(err?.detail || `Client archive failed: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function addClientActivity(clientId: number | string, payload: ClientActivityPayload): Promise<any> {
  const res = await fetch(`${BASE}/api/admin/clients/${clientId}/activities`, {
    method: 'POST',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to log client activity' }));
    throw new Error(err?.detail || `Activity logging failed: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function markClientLostApi(
  clientId: number | string,
  lostReason: string,
  lostNotes?: string
): Promise<{ ok: boolean; client_id: number; leads_updated: number; lost_reason: string }> {
  const res = await fetch(`${BASE}/api/admin/clients/${clientId}/mark-lost`, {
    method: 'POST',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lost_reason: lostReason,
      ...(lostNotes ? { lost_notes: lostNotes } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to mark client as lost' }));
    throw new Error(err?.detail || `Mark lost failed: HTTP ${res.status}`);
  }

  return await res.json();
}
