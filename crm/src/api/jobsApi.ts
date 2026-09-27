import type { BackendJob } from '@/types/backendTypes';
// Rise Up CRM — Production Jobs API Client
// Interfaces with FastAPI backend at /api/admin/jobs

import { api, API_ORIGIN } from '@/lib/api';
import { JobRecord, JobSummaryStats, JobMilestone, JobActivityItem } from '@/types/jobTypes';

const BASE = API_ORIGIN;

export interface JobsDirectoryResponse {
  jobs: JobRecord[];
  summary: JobSummaryStats;
}

export interface CreateJobPayload {
  leadId?: number;
  clientId?: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  zip?: string;
  serviceType?: string;
  contractValue?: number;
  scheduledStart?: string;
  estimatedDays?: number;
  crewLead?: string;
  crewMembers?: string[];
  notes?: string;
  status?: string;
  milestones?: JobMilestone[];
}

export async function fetchJobs(params?: {
  status?: string;
  search?: string;
}): Promise<JobsDirectoryResponse> {
  const query: Record<string, string> = {};
  if (params?.status && params.status !== 'all') query.status = params.status;
  if (params?.search && params.search.trim()) query.search = params.search.trim();

  const qs = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`${BASE}/api/admin/jobs${qs}`, {
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch jobs' }));
    throw new Error(err?.detail || `Failed to fetch jobs: HTTP ${res.status}`);
  }

  const data = await res.json();
  return {
    jobs: (data.jobs || []).map(normalizeJob),
    summary: data.summary || {
      totalCount: 0,
      activeCount: 0,
      completedCount: 0,
      totalValue: 0,
      activeValue: 0,
      milestoneVelocity: 0,
      activeCrews: 0,
    },
  };
}

export async function fetchJob(id: number | string): Promise<{ job: JobRecord; estimate?: any }> {
  const res = await fetch(`${BASE}/api/admin/jobs/${id}`, {
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Job not found' }));
    throw new Error(err?.detail || `Failed to fetch job ${id}`);
  }

  const data = await res.json();
  return {
    job: normalizeJob(data.job),
    estimate: data.estimate,
  };
}

export async function createJob(payload: CreateJobPayload): Promise<JobRecord> {
  const res = await fetch(`${BASE}/api/admin/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...api.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create job' }));
    throw new Error(err?.detail || `Failed to create job: HTTP ${res.status}`);
  }

  const data = await res.json();
  return normalizeJob(data.job);
}

export async function updateJob(
  id: number | string,
  payload: Partial<JobRecord> & { milestones?: JobMilestone[] }
): Promise<JobRecord> {
  const res = await fetch(`${BASE}/api/admin/jobs/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...api.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update job' }));
    throw new Error(err?.detail || `Failed to update job ${id}`);
  }

  const data = await res.json();
  return normalizeJob(data.job);
}

export async function completeJob(
  id: number | string,
  payload: { notes?: string; authorName?: string; authorRole?: string } = {}
): Promise<JobRecord> {
  const res = await fetch(`${BASE}/api/admin/jobs/${id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...api.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to complete job' }));
    throw new Error(err?.detail || `Failed to complete job ${id}`);
  }

  const data = await res.json();
  return normalizeJob(data.job);
}

export async function deleteJob(id: number | string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/admin/jobs/${id}`, {
    method: 'DELETE',
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete job' }));
    throw new Error(err?.detail || `Failed to delete job ${id}`);
  }

  return true;
}

export async function fetchJobActivities(id: number | string): Promise<JobActivityItem[]> {
  const res = await fetch(`${BASE}/api/admin/jobs/${id}/activities`, {
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.activities || [];
}

export async function logJobActivity(
  id: number | string,
  payload: { note: string; authorName?: string; authorRole?: string }
): Promise<{ ok: boolean; note: string }> {
  const res = await fetch(`${BASE}/api/admin/jobs/${id}/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...api.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to log field note' }));
    throw new Error(err?.detail || `Failed to log field note: HTTP ${res.status}`);
  }

  return await res.json();
}

function normalizeJob(raw: BackendJob): JobRecord {
  const ms = Array.isArray(raw.milestones) ? raw.milestones : [];
  const completedCount = ms.filter((m: any) => m.status === 'completed').length;
  const totalCount = ms.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (raw.status === 'complete' ? 100 : 0);

  return {
    id: Number(raw.id),
    job_number: raw.job_number || `JOB-${raw.id}`,
    status: (raw.status || 'scheduled') as JobRecord['status'],
    customer_name: raw.customer_name || 'Homeowner',
    customer_phone: raw.customer_phone || '',
    customer_email: raw.customer_email || '',
    address: raw.address || '',
    city: raw.city || '',
    zip: raw.zip || '',
    service_type: raw.service_type || 'Residential Roofing',
    contract_value: Number(raw.contract_value || 0),
    crew_lead: raw.crew_lead || 'Unassigned',
    crew_members: Array.isArray(raw.crew_members) ? raw.crew_members : [],
    scheduled_start: raw.scheduled_start || '',
    estimated_days: Number(raw.estimated_days || 3),
    actual_start: raw.actual_start || '',
    actual_end: raw.actual_end || '',
    weather_delays: Number(raw.weather_delays || 0),
    notes: raw.notes || '',
    milestones: ms,
    milestone_progress: progress,
    milestones_completed_count: completedCount,
    milestones_total_count: totalCount,
    lead_id: raw.lead_id ? Number(raw.lead_id) : undefined,
    client_id: raw.client_id ? Number(raw.client_id) : undefined,
    estimate_id: raw.estimate_id ? Number(raw.estimate_id) : undefined,
    created_by: raw.created_by ? Number(raw.created_by) : undefined,
    created_by_role_snapshot: raw.created_by_role_snapshot || '',
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}


