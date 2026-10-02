// Rise Up CRM - Real Backend Leads API Client
// Interfaces with FastAPI backend at /api/admin/leads and translates PostgreSQL models

import { api } from '@/lib/api';

import type { BackendLead } from '@/types/backendTypes';

export interface Lead {
  id: string | number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  clientId?: number | string;
  client_id?: number | string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'blue' | 'coral' | 'purple' | 'emerald';
  score?: number; // deprecated
  status: 'new_lead' | 'contacted' | 'inspection_scheduled' | 'proposal_sent' | 'contract_won' | 'lost';
  source: string; // 'website' | 'manual'
  sourceLabel: string;
  leadSourceDetail?: string;
  isClaimed?: boolean;
  claimedBy?: string;
  createdByName?: string;
  value: number; // estimated deal value
  roofSqf?: number | null; // roof sq ft
  contractValue?: number | null;
  estimateTotal?: number | null;
  estimatedValue?: number | null;
  isUploadedEstimate?: boolean;
  estimateTemplateKey?: string | null;
  proposalSentAt?: string | null;
  isContractSigned?: boolean;
  squares?: number; // roof squares
  pitch?: string; // pitch slope e.g. 6/12
  assignedRep: string;
  repInitials: string;
  createdAt: string;
  createdDate?: string;
  speedToCall?: string; // initial response time
  lossReason?: 'competitor_price' | 'ghosted' | 'postponed' | 'diy_handyman' | 'financing_denied' | 'out_of_area';
  lossNotes?: string;
  lostDate?: string;
  tags?: string[];
  notes?: string;
}

export interface LeadsCounts {
  all: number;
  leads: number;
  new_clients: number;
  existing_clients: number;
  lost_leads: number;
}

export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  service?: string;
  serviceColor?: string;
  sqf?: string;
  roofType?: string;
  stories?: string;
  notes?: string;
  leadSource?: string;
}

function serviceToColor(service: string | null | undefined): Lead['serviceColor'] {
  const s = (service || '').toLowerCase();
  if (s.includes('tile')) return 'amber';
  if (s.includes('shingle')) return 'blue';
  if (s.includes('commercial') || s.includes('flat') || s.includes('tpo')) return 'sky';
  if (s.includes('repair') || s.includes('emergency') || s.includes('leak') || s.includes('assessment')) return 'coral';
  if (s.includes('solar') || s.includes('gutter')) return 'purple';
  return 'emerald';
}

function normalizeSource(
  source: string | null | undefined,
  sourceDetail: string | null | undefined,
  createdByName: string | null | undefined,
  assignedToName: string | null | undefined,
  sourceType: string | null | undefined,
  hasCreator: boolean
): { source: string; label: string; isClaimed?: boolean; claimedBy?: string } {
  const s = (source || '').toLowerCase();
  const st = (sourceType || '').toLowerCase();

  // If marked website or no user creator and not explicitly manual
  const isWebsite = st === 'website' || s.includes('website') || (!hasCreator && s !== 'manual');
  if (isWebsite) {
    const isClaimed = Boolean(assignedToName && assignedToName.trim() !== '' && assignedToName !== 'Unassigned');
    return {
      source: 'website',
      label: 'Website Lead',
      isClaimed,
      claimedBy: isClaimed ? assignedToName! : undefined,
    };
  }

  // Manual entry created by a user / team member
  const author = createdByName || sourceDetail || 'Marc Sarellano';
  return {
    source: 'manual',
    label: author,
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'RU').toUpperCase();
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function formatCalendarDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function backendLeadToLead(raw: BackendLead): Lead {
  const hasCreator = Boolean(raw.created_by_user_id || raw.created_by_name);
  const sourceInfo = normalizeSource(
    raw.lead_source,
    raw.lead_source_detail,
    raw.created_by_name,
    raw.assigned_to_name,
    raw.source_type,
    hasCreator
  );
  const repName = raw.assigned_to_name || (sourceInfo.source === 'website' ? 'Unassigned' : (sourceInfo.label || 'Marc Sarellano'));
  
  // Status mapping
  let status: Lead['status'] = 'new_lead';
  const rawStatus = (raw.status || '').toLowerCase();
  const rawStage = ((raw as any).granular_stage || raw.pipeline_stage || '').toLowerCase();

  if (rawStatus === 'lost' || raw.lost_reason) {
    status = 'lost';
  } else if (
    rawStatus === 'won' ||
    rawStatus === 'closed_won' ||
    raw.contract_signed_at ||
    rawStage === 'stage_4_closing' ||
    rawStage === 'stage_5_completion_followup' ||
    rawStage === 'closed_won'
  ) {
    status = 'contract_won';
  } else if (
    rawStatus === 'estimate_sent' ||
    raw.proposal_sent_at ||
    rawStage === 'estimate_sent' ||
    rawStage === 'follow_up' ||
    rawStage === 'followup_2day' ||
    rawStage === 'followup_7day' ||
    rawStage === 'decision_followup' ||
    rawStage === 'future_followup'
  ) {
    status = 'proposal_sent';
  } else if (
    rawStatus === 'site_visit_scheduled' ||
    raw.site_visit_scheduled_at ||
    rawStage === 'stage_3_site_visit_estimate' ||
    rawStage === 'inspection_scheduled' ||
    rawStage === 'inspection_completed' ||
    rawStage === 'estimate_building'
  ) {
    status = 'inspection_scheduled';
  } else if (
    rawStatus === 'contacted' ||
    raw.initial_contacted_at ||
    rawStage === 'stage_2_initial_contact' ||
    rawStage === 'initial_call'
  ) {
    status = 'contacted';
  } else {
    status = 'new_lead';
  }

  // Calculate score if 0 or null
  let score = raw.lead_score || 0;
  if (!score) {
    if (raw.priority === 'urgent' || raw.priority === 'hot') score = 94;
    else if (raw.priority === 'high') score = 88;
    else if (raw.priority === 'medium') score = 76;
    else score = 65;
  }

  // Estimate value - only use real DB value, never guess
  const val = raw.estimated_value ? Math.round(Number(raw.estimated_value)) : 0;

  // Roof squares — 0 means not recorded yet
  const squares = raw.roof_sqf ? Math.round(raw.roof_sqf / 100) : 0;

  // Build tags
  const tags: string[] = [];
  if (raw.priority === 'hot' || raw.priority === 'urgent') tags.push('High Priority');
  if (raw.service_type) tags.push(raw.service_type);
  if (raw.city) tags.push(raw.city);

  // Speed to call — empty string means no contact time recorded
  let speedToCall = '';
  if (raw.initial_contacted_at && raw.created_at) {
    const diffMinutes = Math.max(1, Math.round((new Date(raw.initial_contacted_at).getTime() - new Date(raw.created_at).getTime()) / 60000));
    speedToCall = diffMinutes < 60 ? `${diffMinutes} min` : `${Math.round(diffMinutes / 60)}h`;
  }

  return {
    id: raw.id,
    name: raw.full_name || 'Homeowner',
    phone: raw.phone || '',
    email: raw.email || '',
    address: raw.address || 'Address pending',
    city: raw.city || 'Oceanside',
    zip: raw.zip || '',
    clientId: (raw as any).client_id ?? (raw as any).clientId,
    client_id: (raw as any).client_id ?? (raw as any).clientId,
    service: raw.service_type || 'Residential Roofing',
    serviceColor: serviceToColor(raw.service_type),
    score,
    status,
    source: sourceInfo.source,
    sourceLabel: sourceInfo.label,
    leadSourceDetail: raw.lead_source_detail || undefined,
    isClaimed: sourceInfo.isClaimed,
    claimedBy: sourceInfo.claimedBy,
    createdByName: raw.created_by_name || undefined,
    value: val,
    roofSqf: raw.roof_sqf ? Number(raw.roof_sqf) : null,
    contractValue: (raw as any).contract_value ? Number((raw as any).contract_value) : null,
    estimateTotal: (raw as any).estimate_total ? Number((raw as any).estimate_total) : null,
    estimatedValue: (raw as any).raw_estimated_value ? Number((raw as any).raw_estimated_value) : (raw.estimated_value ? Number(raw.estimated_value) : null),
    isUploadedEstimate: Boolean((raw as any).is_uploaded_estimate || (raw as any).estimate_template_key === 'uploaded'),
    estimateTemplateKey: (raw as any).estimate_template_key || null,
    proposalSentAt: (raw as any).proposal_sent_at || null,
    isContractSigned: Boolean(
      (raw as any).contract_signed_at ||
      (raw as any).contract_status === 'signed' ||
      (raw as any).contract_status === 'client_signed' ||
      (raw as any).contract_status === 'fully_executed' ||
      raw.status === 'won'
    ),
    squares,
    pitch: raw.pitch || '',
    assignedRep: repName,
    repInitials: getInitials(repName),
    createdAt: formatRelativeDate(raw.created_at),
    createdDate: formatCalendarDate(raw.created_at),
    speedToCall,
    lossReason: (raw.lost_reason as any) || undefined,
    lossNotes: raw.lost_notes || undefined,
    lostDate: raw.lost_at ? formatCalendarDate(raw.lost_at) : (raw.lost_reason ? formatCalendarDate(raw.updated_at) : undefined),
    tags,
    notes: raw.notes || '',
  };
}

export function frontendStatusToBackend(status: Lead['status']): {
  status: string;
  pipeline_stage: string;
  lost_reason?: string | null;
} {
  switch (status) {
    case 'new_lead':
      return { status: 'new', pipeline_stage: 'stage_1_lead_gen', lost_reason: null };
    case 'contacted':
      return { status: 'contacted', pipeline_stage: 'stage_2_initial_contact', lost_reason: null };
    case 'inspection_scheduled':
      return { status: 'site_visit_scheduled', pipeline_stage: 'stage_3_site_visit_estimate', lost_reason: null };
    case 'proposal_sent':
      return { status: 'estimate_sent', pipeline_stage: 'stage_3_site_visit_estimate', lost_reason: null };
    case 'contract_won':
      return { status: 'won', pipeline_stage: 'stage_4_closing', lost_reason: null };
    case 'lost':
      return { status: 'lost', pipeline_stage: 'stage_1_lead_gen' };
    default:
      return { status: 'new', pipeline_stage: 'stage_1_lead_gen' };
  }
}

export const leadsApi = {
  async listLeads(params?: {
    search?: string;
    status?: string;
    category?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: Lead[]; rawLeads: BackendLead[]; total: number; counts: LeadsCounts }> {
    const query: Record<string, string> = {};
    if (params?.search && params.search.trim()) query.search = params.search.trim();
    if (params?.status && params.status !== 'all') query.status = params.status;
    if (params?.category && params.category !== 'all') query.category = params.category;
    if (params?.priority && params.priority !== 'all') query.priority = params.priority;
    if (params?.limit !== undefined && params?.limit !== null) query.limit = String(params.limit);
    if (params?.offset !== undefined && params?.offset !== null) query.offset = String(params.offset);

    const res = await api.getLeads(Object.keys(query).length > 0 ? query : undefined);
    const rawList: BackendLead[] = res?.leads || [];
    const leads = rawList.map(backendLeadToLead);
    const counts: LeadsCounts = res?.counts || {
      all: res?.total ?? leads.length,
      leads: leads.filter((l) => l.status !== 'lost' && l.status !== 'contract_won').length,
      new_clients: leads.filter((l) => l.status === 'contract_won').length,
      existing_clients: 0,
      lost_leads: leads.filter((l) => l.status === 'lost').length,
    };
    return {
      leads,
      rawLeads: rawList,
      total: res?.total ?? leads.length,
      counts,
    };
  },

  async getLead(id: number | string): Promise<Lead> {
    const res = await api.getLead(id);
    return backendLeadToLead(res.lead);
  },

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const payload = {
      fullName: input.name,
      full_name: input.name,
      phone: input.phone,
      email: input.email || undefined,
      address: input.address || undefined,
      city: input.city || 'Oceanside',
      zip: input.zipCode || undefined,
      serviceType: input.service || 'Residential Roofing',
      service_type: input.service || 'Residential Roofing',
      notes: input.notes || undefined,
      leadSource: input.leadSource || 'team_canvassing',
      lead_source: input.leadSource || 'team_canvassing',
    };

    const res = await api.createLead(payload);
    return backendLeadToLead(res.lead);
  },

  async updateLead(id: number | string, patch: Partial<BackendLead>): Promise<any> {
    return api.updateLead(id, patch);
  },

  async updateLeadStage(id: number | string, stage: Lead['status']): Promise<any> {
    const backendFields = frontendStatusToBackend(stage);
    return api.updateLead(id, backendFields);
  },

  async claimLead(id: number | string): Promise<any> {
    return api.claimLead(id);
  },

  async reassignLead(id: number | string, newUserId: number, notes?: string): Promise<any> {
    return api.reassignLead(id, newUserId, notes);
  },

  async markLeadAsLost(
    id: number | string,
    reason: string,
    lossNotes?: string,
    authorInfo?: { authorName?: string; authorRole?: string }
  ): Promise<any> {
    const payload: Record<string, any> = {
      status: 'lost',
      lost_reason: reason,
    };
    if (lossNotes?.trim()) {
      payload.lost_notes = lossNotes.trim();
    }
    await api.updateLead(id, payload);
    try {
      await api.addLeadActivity(id, {
        title: `Opportunity Marked as Lost: ${reason}`,
        description: lossNotes || 'Lost opportunity reason recorded.',
        activityType: 'status_change',
        authorName: authorInfo?.authorName,
        authorRole: authorInfo?.authorRole,
      });
    } catch {
      // ignore activity log error
    }
  },

  async reactivateLead(id: number | string): Promise<any> {
    const payload = {
      status: 'contacted',
      pipeline_stage: 'stage_2_initial_contact',
      lost_reason: null,
      lost_notes: null,
      lost_at: null,
    };
    await api.updateLead(id, payload);
    try {
      await api.addLeadActivity(id, {
        title: 'Lead Reactivated',
        description: 'Lead returned to active contacted pipeline.',
        activityType: 'status_change',
      });
    } catch {
      // ignore activity log error
    }
  },

  async deleteLead(id: number | string): Promise<any> {
    return api.deleteLead(id);
  },

  async getActivities(id: number | string) {
    return api.getLeadActivities(id);
  },

  async addActivity(
    id: number | string,
    title: string,
    description?: string,
    activityType: string = 'note',
    authorInfo?: { authorName?: string; authorRole?: string }
  ) {
    return api.addLeadActivity(id, {
      title,
      description,
      activityType,
      authorName: authorInfo?.authorName,
      authorRole: authorInfo?.authorRole,
    });
  },

  async fetchLeadSources(): Promise<string[]> {
    const res = await api.getLeadSources();
    return res.sources || [];
  }
};
