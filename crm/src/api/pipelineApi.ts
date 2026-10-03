// Rise Up CRM — Pipeline API Client
// Interfaces with FastAPI backend at /api/admin/pipeline
// Provides live pipeline data for Dashboard (8-column) and PipelinePage (11-step + 4-phase)

import type { ColumnData, DealCard, PipelineDealItem, PipelineStageId } from '../components/pipeline/pipelineTypes';
import { httpClient } from '@/shared/api/client';
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

export interface PipelineApiSummary {
  total_leads?: number;
  total_pipeline_value?: number;
  unassigned_count?: number;
  sla_health_pct?: number;
  active_installations?: number;
  won_count?: number;
  lost_count?: number;
}

export interface PipelineApiResponse {
  ok?: boolean;
  granular_stages?: Record<string, BackendLead[]>;
  stages?: Record<string, BackendLead[]>;
  summary?: PipelineApiSummary;
  users?: unknown[];
  detail?: string;
}

export async function fetchPipelineForDashboard(): Promise<{ columns: ColumnData[]; summary: PipelineSummary | null }> {
  try {
    const json = await httpClient.get<PipelineApiResponse>('/admin/pipeline', { timeoutMs: 8000 });
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
          // Raw value fields for hierarchy resolution
          contractValue: lead.contract_value ? Number(lead.contract_value) : null,
          estimateTotal: lead.estimate_total ? Number(lead.estimate_total) : null,
          estimatedValue: lead.raw_estimated_value ? Number(lead.raw_estimated_value) : (lead.estimated_value ? Number(lead.estimated_value) : null),
          roofSqf: lead.roof_sqf ? Number(lead.roof_sqf) : null,
          proposalSentAt: lead.proposal_sent_at || null,
          isUploadedEstimate: Boolean(lead.is_uploaded_estimate || lead.estimate_template_key === 'uploaded'),
          estimateTemplateKey: lead.estimate_template_key || null,
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
          siteVisitScheduledAt: lead.site_visit_scheduled_at || null,
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
          totalLeads: rawSummary.total_leads ?? 0,
          totalPipelineValue: rawSummary.total_pipeline_value ?? 0,
          unassignedCount: rawSummary.unassigned_count ?? 0,
          slaHealthPct: rawSummary.sla_health_pct ?? 0,
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
  users: unknown[];
}> {
  const json = await httpClient.get<PipelineApiResponse>('/admin/pipeline');
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
      // Raw value fields for hierarchy resolution
      contractValue: l.contract_value ? Number(l.contract_value) : null,
      estimateTotal: l.estimate_total ? Number(l.estimate_total) : null,
      estimatedValue: l.raw_estimated_value ? Number(l.raw_estimated_value) : (l.estimated_value ? Number(l.estimated_value) : null),
      roofSqf: l.roof_sqf ? Number(l.roof_sqf) : null,
      roof_sqf: l.roof_sqf ? Number(l.roof_sqf) : null,
      proposalSentDate: l.proposal_sent_at || undefined,
      proposalSentAt: l.proposal_sent_at || null,
      isUploadedEstimate: Boolean(l.is_uploaded_estimate || l.estimate_template_key === 'uploaded'),
      estimateTemplateKey: l.estimate_template_key || null,
      isContractSigned: isSigned,
      contractSignedAt: l.contract_signed_at || null,
      contractStatus: l.contract_status || null,
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
      scheduledDate: l.site_visit_scheduled_at
        ? new Date(l.site_visit_scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : undefined,
      scheduledTime: l.site_visit_scheduled_at
        ? new Date(l.site_visit_scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : undefined,
      siteVisitScheduledAt: l.site_visit_scheduled_at || null,
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
        totalLeads: rawSummary.total_leads ?? 0,
        totalPipelineValue: rawSummary.total_pipeline_value ?? 0,
        unassignedCount: rawSummary.unassigned_count ?? 0,
        slaHealthPct: rawSummary.sla_health_pct ?? 0,
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
): Promise<{ ok: boolean; lead: BackendLead }> {
  return await httpClient.put<{ ok: boolean; lead: BackendLead }>(`/admin/pipeline/${leadId}/stage`, {
    stage: newStage,
    notes: notes || undefined,
    plainNote: authorInfo?.plainNote || undefined,
    authorName: authorInfo?.authorName || undefined,
    authorRole: authorInfo?.authorRole || undefined,
  });
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
): Promise<{ ok: boolean; lead: BackendLead }> {
  return await httpClient.put<{ ok: boolean; lead: BackendLead }>(`/admin/pipeline/${leadId}/stage`, {
    stage: outcome,
    notes: payload.notes,
    lossReason: payload.lossReason,
    authorName: payload.authorName,
    authorRole: payload.authorRole,
  });
}

/**
 * Toggle or update an individual SOP checklist item for a pipeline deal.
 */
export async function toggleChecklistItem(
  leadId: string | number,
  itemKey: string,
  completed: boolean,
  stage?: string
): Promise<{ ok: boolean; checklist_item: unknown }> {
  return await httpClient.put<{ ok: boolean; checklist_item: unknown }>(`/admin/pipeline/${leadId}/checklist/${itemKey}`, { completed, stage });
}

/**
 * Log a follow-up action with homeowner.
 * Resets the 48-hour timer, saves activity, schedules a reminder task, and updates notes.
 */
export async function logDealFollowUp(
  leadId: string | number,
  payload: { method: string; notes: string; outcome?: string }
): Promise<{ ok: boolean; message: string; followUpAt: string }> {
  return await httpClient.post<{ ok: boolean; message: string; followUpAt: string }>(`/admin/pipeline/${leadId}/follow-up`, payload);
}

export interface PipelineAnalyticsData {
  probabilities?: Record<string, number>;
  [key: string]: unknown;
}

export async function fetchPipelineAnalytics(): Promise<PipelineAnalyticsData> {
  try {
    return await httpClient.get<PipelineAnalyticsData>('/admin/pipeline/analytics');
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
export async function claimLead(leadId: string | number): Promise<{ ok: boolean; lead: BackendLead }> {
  return await httpClient.post<{ ok: boolean; lead: BackendLead }>(`/admin/pipeline/${leadId}/claim`);
}

/**
 * Reassign a pipeline lead to another staff member.
 */
export async function reassignLead(
  leadId: string | number,
  newUserId: number,
  notes?: string
): Promise<{ ok: boolean; lead: BackendLead }> {
  return await httpClient.post<{ ok: boolean; lead: BackendLead }>(`/admin/pipeline/${leadId}/reassign`, {
    new_user_id: newUserId,
    notes,
  });
}
