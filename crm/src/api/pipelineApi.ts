// Rise Up CRM — Pipeline API Client
// Interfaces with FastAPI backend at /api/admin/pipeline
// Provides live pipeline data for Dashboard (8-column) and PipelinePage (11-step + 4-phase)

import type { ColumnData, DealCard, PipelineDealItem, PipelineStageId } from '../components/pipeline/pipelineTypes';
import { api, API_ORIGIN } from '@/lib/api';
import type { BackendLead } from '@/types/backendTypes';

export type { PipelineDealItem, PipelineStageId };
import {
  serviceToColor,
  relativeTime,
  classifyToDashboardColumn,
  COLUMN_CONFIG,
  COLUMN_ORDER,
  normalizeStageId,
  normalizeSlaStatus
} from '../utils/pipelineUtils';

const BASE = API_ORIGIN;
const API_KEY = import.meta.env.VITE_CRM_API_KEY || '';

export type { BackendLead as BackendLeadRaw };

export interface PipelineSummary {
  totalLeads: number;
  totalPipelineValue: number;
  unassignedCount: number;
  slaHealthPct: number;
  activeInstallations?: number;
  wonCount?: number;
  lostCount?: number;
}

export async function fetchPipelineForDashboard(): Promise<{ columns: ColumnData[]; summary: PipelineSummary | null }> {
  try {
    const res = await fetch(`${BASE}/api/admin/pipeline`, {
      headers: api.getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { columns: [], summary: null };
    const json = await res.json();
    if (!json?.ok) return { columns: [], summary: null };

    // Prefer granular_stages or stages
    const allLeads: BackendLead[] = json.granular_stages
      ? Object.values<BackendLead[]>(json.granular_stages).flat()
      : Object.values<BackendLead[]>(json.stages || {}).flat();

    // Deduplicate by ID
    const uniqueMap = new Map<number, BackendLead>();
    for (const l of allLeads) {
      if (!uniqueMap.has(l.id)) uniqueMap.set(l.id, l);
    }
    const uniqueLeads = Array.from(uniqueMap.values());

    const buckets: Record<string, DealCard[]> = {};
    for (const colId of COLUMN_ORDER) buckets[colId] = [];

    for (const lead of uniqueLeads) {
      const colId = classifyToDashboardColumn(lead);
      if (buckets[colId]) {
        const isSigned = Boolean(
          lead.contract_signed_at ||
          lead.granular_stage === 'contract_signed' ||
          lead.pipeline_stage === 'contract_signed' ||
          lead.contract_status === 'client_signed' ||
          lead.contract_status === 'signed' ||
          lead.contract_status === 'fully_executed' ||
          lead.status === 'won'
        );
        buckets[colId].push({
          id: String(lead.id),
          clientId: lead.client_id ?? null,
          name: lead.full_name,
          location: lead.address
            ? `${lead.address}${lead.city ? `, ${lead.city}` : ''}`
            : (lead.city ? `${lead.city}, CA` : 'No address provided'),
          address: lead.address || undefined,
          city: lead.city || undefined,
          zip: lead.zip || undefined,
          service: lead.service_type || 'Roofing',
          serviceColor: serviceToColor(lead.service_type || ''),
          time: relativeTime(lead.created_at),
          phone: lead.phone || undefined,
          email: lead.email || undefined,
          value: Number(lead.contract_value || lead.estimate_total || lead.estimated_value || 0),
          notes: lead.notes || undefined,
          isFollowupOverdue: Boolean(lead.is_followup_overdue),
          hoursUntilAutoMove: lead.hours_until_auto_move ?? null,
          followupDaysRemaining: lead.followup_days_remaining,
          followupHoursRemaining: lead.followup_hours_remaining,
          followUpAt: lead.follow_up_at,
          leadSource: lead.lead_source || (lead.created_by_user_id ? 'manual' : 'website'),
          leadSourceDetail: lead.lead_source_detail || undefined,
          sourceType: lead.source_type || undefined,
          assignedToUserId: lead.assigned_to_user_id,
          assignedToName: lead.assigned_to_name,
          createdByUserId: lead.created_by_user_id,
          createdByName: lead.created_by_name,
          contractSignedAt: lead.contract_signed_at || null,
          contractStatus: lead.contract_status || null,
          isContractSigned: isSigned,
          granularStage: lead.granular_stage || undefined,
          pipelineStage: lead.pipeline_stage || undefined,
        });
      }
    }

    const columns: ColumnData[] = COLUMN_ORDER.map((colId) => ({
      ...COLUMN_CONFIG[colId],
      count: buckets[colId].length,
      cards: buckets[colId],
    }));

    const rawSummary = json.summary;
    const summary: PipelineSummary | null = rawSummary
      ? {
          totalLeads: rawSummary.total_leads,
          totalPipelineValue: rawSummary.total_pipeline_value,
          unassignedCount: rawSummary.unassigned_count,
          slaHealthPct: rawSummary.sla_health_pct,
          activeInstallations: rawSummary.active_installations,
          wonCount: rawSummary.won_count,
          lostCount: rawSummary.lost_count,
        }
      : null;

    return { columns, summary };
  } catch {
    return { columns: [], summary: null };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 2. PIPELINE PAGE REAL DATA CLIENT (11-STAGE & 4-PHASE MODEL)
// ──────────────────────────────────────────────────────────────────────────

export async function fetchPipelineDeals(): Promise<{
  deals: PipelineDealItem[];
  summary: PipelineSummary | null;
  users: any[];
}> {
  const res = await fetch(`${BASE}/api/admin/pipeline`, {
    headers: api.getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to load pipeline: HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json?.ok) {
    throw new Error(json?.detail || 'Failed to load pipeline data');
  }

  // Gather all leads from granular_stages (preferred) or stages
  const rawLeads: BackendLead[] = json.granular_stages
    ? Object.values<BackendLead[]>(json.granular_stages).flat()
    : Object.values<BackendLead[]>(json.stages || {}).flat();

  // Deduplicate by ID
  const map = new Map<number, BackendLead>();
  for (const l of rawLeads) {
    if (!map.has(l.id)) map.set(l.id, l);
  }
  const uniqueLeads = Array.from(map.values());

  const deals: PipelineDealItem[] = uniqueLeads.map((l) => {
    let stageId = normalizeStageId(l.granular_stage || l.pipeline_stage || undefined);
    const isSigned = Boolean(
      l.contract_signed_at ||
      l.contract_status === 'client_signed' ||
      l.contract_status === 'signed' ||
      l.contract_status === 'fully_executed' ||
      l.status === 'won' ||
      l.granular_stage === 'contract_signed' ||
      l.pipeline_stage === 'contract_signed'
    );
    if (isSigned && stageId !== 'active_jobs' && stageId !== 'closed_lost') {
      stageId = 'contract_signed';
    }
    const serviceName = l.service_type || 'Residential Roofing';
    const val = Number(l.contract_value || l.estimate_total || l.estimated_value || 0);

    const checklist = l.checklist || [];

    const slaStatus = normalizeSlaStatus(l.sla_status);
    const slaText = l.sla_badge_label || (slaStatus === 'overdue' ? 'Action overdue' : slaStatus === 'due_today' ? 'Due today' : 'On track');

    const rawSrc = `${l.source_type || ''} ${l.lead_source || ''} ${l.lead_source_detail || ''}`.toLowerCase();
    const isWebsite = l.source_type === 'website' || rawSrc.includes('website') || rawSrc.includes('contact') || rawSrc.includes('estimate') || (!l.created_by_user_id && l.lead_source !== 'manual');
    const hasAssignee = Boolean(l.assigned_to_user_id && l.assigned_to_name && l.assigned_to_name.trim() !== '' && l.assigned_to_name !== 'Unassigned');
    const estimatorName: string = (l.assigned_to_name && l.assigned_to_name.trim() !== '' && l.assigned_to_name !== 'Unassigned') ? l.assigned_to_name : 'Unassigned';
    const estimatorRole: string = l.assigned_to_role || (hasAssignee ? 'Estimator' : 'Unclaimed');

    return {
      id: String(l.id),
      name: l.full_name,
      phone: l.phone || 'No phone provided',
      email: l.email || 'No email provided',
      address: l.address || 'Address pending',
      city: l.city || 'Oceanside',
      service: serviceName,
      serviceColor: serviceToColor(serviceName),
      value: val,
      stageId,
      daysInStage: l.days_in_stage ?? 0,
      score: l.lead_score || 0,
      leadSource: isWebsite ? 'website' : (l.lead_source || (l.created_by_user_id ? 'manual' : 'website')),
      leadSourceDetail: l.lead_source_detail || (isWebsite ? 'Website Contact Form' : undefined),
      sourceType: isWebsite ? 'website' : (l.source_type || undefined),
      assignedToUserId: hasAssignee ? l.assigned_to_user_id : undefined,
      assignedToName: hasAssignee ? l.assigned_to_name : undefined,
      createdByName: l.created_by_name,
      estimator: {
        name: estimatorName,
        avatar: l.assigned_to_avatar || '',
        role: estimatorRole,
      },
      slaStatus,
      slaText,
      photosCount: l.photo_count || 0,
      proposalSentDate: l.proposal_sent_at || undefined,
      notes: l.notes || '',
      lossReason: l.lost_reason || undefined,
      isFollowupOverdue: l.is_followup_overdue || false,
      followupDaysRemaining: l.followup_days_remaining,
      followupHoursRemaining: l.followup_hours_remaining,
      hoursUntilAutoMove: l.hours_until_auto_move,
      lastContactAt: l.last_contact_at,
      followUpAt: l.follow_up_at,
      checklist,
    };
  });

  const rawSummary = json.summary;
  const summary: PipelineSummary | null = rawSummary
    ? {
        totalLeads: rawSummary.total_leads,
        totalPipelineValue: rawSummary.total_pipeline_value,
        unassignedCount: rawSummary.unassigned_count,
        slaHealthPct: rawSummary.sla_health_pct,
        activeInstallations: rawSummary.active_installations,
        wonCount: rawSummary.won_count,
        lostCount: rawSummary.lost_count,
      }
    : null;

  return { deals, summary, users: json.users || [] };
}

export async function updatePipelineDealStage(
  leadId: string | number,
  newStage: string,
  notes?: string,
  authorInfo?: { plainNote?: string; authorName?: string; authorRole?: string }
): Promise<{ ok: boolean; lead: any }> {
  const res = await fetch(`${BASE}/api/admin/pipeline/${leadId}/stage`, {
    method: 'PUT',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage: newStage,
      notes: notes || undefined,
      plainNote: authorInfo?.plainNote || undefined,
      authorName: authorInfo?.authorName || undefined,
      authorRole: authorInfo?.authorRole || undefined,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Stage update failed with HTTP ${res.status}`);
  }

  return await res.json();
}

export async function setDealOutcome(
  leadId: string | number,
  outcome: 'closed_lost' | 'closed_won' | 'future_followup',
  payload: {
    notes?: string;
    lossReason?: string;
    authorName?: string;
    authorRole?: string;
  }
): Promise<{ ok: boolean; lead: any }> {
  const res = await fetch(`${BASE}/api/admin/pipeline/${leadId}/stage`, {
    method: 'PUT',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage: outcome,
      notes: payload.notes,
      lossReason: payload.lossReason,
      authorName: payload.authorName,
      authorRole: payload.authorRole,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Outcome update failed with HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Toggle or update an individual SOP checklist item for a pipeline deal.
 */
export async function toggleChecklistItem(
  leadId: string | number,
  itemKey: string,
  completed: boolean,
  stage?: string
): Promise<{ ok: boolean; checklist_item: any }> {
  const res = await fetch(`${BASE}/api/admin/pipeline/${leadId}/checklist/${itemKey}`, {
    method: 'PUT',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ completed, stage }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update checklist item' }));
    throw new Error(err?.detail || 'Failed to update checklist item');
  }

  return await res.json();
}

/**
 * Log a follow-up action with homeowner.
 * Resets the 48-hour timer, saves activity, schedules a reminder task, and updates notes.
 */
export async function logDealFollowUp(
  leadId: string | number,
  payload: { method: string; notes: string; outcome?: string }
): Promise<{ ok: boolean; message: string; followUpAt: string }> {
  const res = await fetch(`${BASE}/api/admin/pipeline/${leadId}/follow-up`, {
    method: 'POST',
    headers: {
      ...api.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to log follow-up' }));
    throw new Error(err?.detail || 'Failed to log follow-up');
  }

  return await res.json();
}

export async function fetchPipelineAnalytics() {
  try {
    const res = await fetch(`${BASE}/api/admin/pipeline/analytics`, {
      headers: api.getAuthHeaders(),
    });
    if (!res.ok) {
      return {
        probabilities: {
          cold_lead: 0.10,
          initial_call: 0.20,
          estimate_scheduled: 0.40,
          estimate_sent: 0.60,
          follow_up: 0.65,
          contract_sent: 0.80,
          contract_signed: 0.95,
          active_jobs: 0.98,
          closed_lost: 0.0,
        },
      };
    }
    return await res.json();
  } catch (err) {
    console.warn('Pipeline analytics endpoint error, using defaults:', err);
    return {
      probabilities: {
        cold_lead: 0.10,
        initial_call: 0.20,
        estimate_scheduled: 0.40,
        estimate_sent: 0.60,
        follow_up: 0.65,
        contract_sent: 0.80,
        contract_signed: 0.95,
        active_jobs: 0.98,
        closed_lost: 0.0,
      },
    };
  }
}

/**
 * Claim an unassigned website lead for the current logged in user.
 */
export async function claimLead(leadId: string | number): Promise<{ ok: boolean; lead: any }> {
  return await api.claimLead(leadId);
}

/**
 * Reassign a pipeline lead to another staff member.
 */
export async function reassignLead(
  leadId: string | number,
  newUserId: number,
  notes?: string
): Promise<{ ok: boolean; lead: any }> {
  return await api.reassignLead(leadId, newUserId, notes);
}
