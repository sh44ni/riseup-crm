import type { DealCard, ColumnData, PipelineStageId } from '../components/pipeline/pipelineTypes';
import type { BackendLead } from '../types/backendTypes';

// Service color mapper
export function serviceToColor(service: string | null | undefined): DealCard['serviceColor'] {
  const s = (service || '').toLowerCase();
  if (s.includes('tile')) return 'amber';
  if (s.includes('shingle')) return 'blue';
  if (s.includes('commercial') || s.includes('flat')) return 'sky';
  if (s.includes('repair') || s.includes('maintenance')) return 'coral';
  if (s.includes('metal')) return 'indigo';
  if (s.includes('solar') || s.includes('gc')) return 'purple';
  return 'emerald';
}

export function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function classifyToDashboardColumn(lead: BackendLead): string {
  const {
    pipeline_stage,
    granular_stage,
    proposal_sent_at,
    contract_signed_at,
    contract_status,
    job_completed_at,
    status,
    job_id,
    job_status,
  } = lead;

  // Completed jobs are NOT shown on the active dashboard columns
  if (
    job_completed_at ||
    status === 'completed' ||
    pipeline_stage === 'job_completed' ||
    granular_stage === 'job_completed' ||
    pipeline_stage === 'completed' ||
    granular_stage === 'completed'
  ) {
    return 'completed';
  }

  // Explicit active job in production
  if (
    granular_stage === 'active_jobs' ||
    pipeline_stage === 'active_jobs' ||
    pipeline_stage === 'stage_5_completion_followup'
  ) {
    return 'active_jobs';
  }

  // Contract signed/won leads classify to 'contract_signed'.
  // The dashboard COLUMN_ORDER doesn't include 'contract_signed', so pipelineApi.ts
  // naturally drops these leads (no bucket for them) — they only appear in Pipeline page.
  const isSigned = Boolean(
    contract_signed_at ||
    contract_status === 'signed' ||
    contract_status === 'client_signed' ||
    contract_status === 'fully_executed' ||
    status === 'won' ||
    granular_stage === 'contract_signed' ||
    pipeline_stage === 'contract_signed'
  );

  if (isSigned) {
    return 'contract_signed'; // No dashboard bucket → not rendered on dashboard
  }

  const st = granular_stage || pipeline_stage;

  // Direct match to granular stage if available
  if (st === 'cold_lead' || st === 'stage_1_lead_gen' || st === 'new_leads') return 'new_leads';
  if (st === 'initial_call' || st === 'stage_2_initial_contact' || st === 'contacted') return 'contacted';
  if (st === 'inspection_scheduled' || st === 'inspection_completed' || st === 'estimate_building' || st === 'est_scheduled' || st === 'estimate_scheduled') return 'est_scheduled';
  if (st === 'estimate_sent' || st === 'est_sent') return 'est_sent';
  if (st === 'follow_up' || st === 'followup_2day' || st === 'followup_7day' || st === 'decision_followup' || st === 'future_followup') {
    return 'follow_up';
  }
  if (st === 'contract_sent') return 'contract_sent';
  // contract_signed handled above (returns 'completed')
  if (st === 'active_jobs') return 'active_jobs';

  // Fallback to legacy heuristics
  switch (pipeline_stage) {
    case 'stage_1_lead_gen':
      return 'new_leads';
    case 'stage_2_initial_contact':
      return 'contacted';
    case 'stage_3_site_visit_estimate':
      if (proposal_sent_at) return 'est_sent';
      return 'est_scheduled';
    case 'stage_4_closing':
      return 'contract_sent';
    case 'stage_5_completion_followup':
      return 'active_jobs';
    default:
      return 'new_leads';
  }
}

export const COLUMN_CONFIG: Record<string, Omit<ColumnData, 'count' | 'cards'>> = {
  new_leads:       { id: 'new_leads',       title: 'New Leads',          bgColor: 'rgba(226,232,240,0.72)', borderColor: 'rgba(148,163,184,0.60)', accentColor: '#475569', pillClass: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-xs border border-slate-600/60', badgeClass: 'bg-black/30 text-white font-black', iconType: 'users' },
  contacted:       { id: 'contacted',       title: 'Leads Contacted',    bgColor: 'rgba(186,230,253,0.65)', borderColor: 'rgba(56,189,248,0.55)',  accentColor: '#0284c7', pillClass: 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] text-white shadow-xs border border-sky-400/50',    badgeClass: 'bg-black/20 text-white font-black', iconType: 'phone' },
  est_scheduled:   { id: 'est_scheduled',   title: 'Estimate Scheduled', bgColor: 'rgba(233,213,255,0.65)', borderColor: 'rgba(192,132,252,0.55)', accentColor: '#7c3aed', pillClass: 'bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] text-white shadow-xs border border-purple-400/50', badgeClass: 'bg-black/20 text-white font-black', iconType: 'calendar' },
  est_sent:        { id: 'est_sent',        title: 'Estimate Sent',      bgColor: 'rgba(254,240,138,0.65)', borderColor: 'rgba(234,179,8,0.55)',   accentColor: '#d97706', pillClass: 'bg-gradient-to-r from-[#f59e0b] via-[#eab308] to-[#facc15] text-slate-950 shadow-xs border border-amber-400/70 font-black', badgeClass: 'bg-black/15 text-slate-950 font-black', iconType: 'file-text' },
  follow_up:       { id: 'follow_up',       title: 'Follow-Up',          bgColor: 'rgba(243,232,255,0.72)', borderColor: 'rgba(168,85,247,0.55)',  accentColor: '#9333ea', pillClass: 'bg-gradient-to-r from-[#7c3aed] via-[#9333ea] to-[#a855f7] text-white shadow-xs border border-purple-400/50 font-black', badgeClass: 'bg-black/20 text-white font-black', iconType: 'clock' },
  contract_sent:   { id: 'contract_sent',   title: 'Contract Sent',      bgColor: 'rgba(254,243,199,0.70)', borderColor: 'rgba(245,158,11,0.55)',  accentColor: '#d97706', pillClass: 'bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] text-white shadow-xs border border-amber-400/60 font-black', badgeClass: 'bg-black/20 text-white font-black', iconType: 'file-text' },
  contract_signed: { id: 'contract_signed', title: 'Contract Signed',    bgColor: 'rgba(209,250,229,0.70)', borderColor: 'rgba(52,211,153,0.55)',  accentColor: '#059669', pillClass: 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#34d399] text-white shadow-xs border border-emerald-400/60 font-black', badgeClass: 'bg-black/20 text-white font-black', iconType: 'trophy' },
  active_jobs:     { id: 'active_jobs',     title: 'Active Jobs',        bgColor: 'rgba(207,250,254,0.70)', borderColor: 'rgba(34,211,238,0.55)',  accentColor: '#0891b2', pillClass: 'bg-gradient-to-r from-[#0891b2] via-[#06b6d4] to-[#22d3ee] text-white shadow-xs border border-cyan-400/50', badgeClass: 'bg-black/20 text-white font-black', iconType: 'briefcase' },
};

// Dashboard: 7 columns (contract_signed is Pipeline-only; signed leads hidden from dashboard)
export const COLUMN_ORDER = ['new_leads', 'contacted', 'est_scheduled', 'est_sent', 'follow_up', 'contract_sent', 'active_jobs'];

export function normalizeStageId(rawStage: string | undefined): PipelineStageId {
  // Legacy/removed follow-up stages → follow_up
  if (
    rawStage === 'followup_2day' ||
    rawStage === 'followup_7day' ||
    rawStage === 'decision_followup' ||
    rawStage === 'future_followup'
  ) {
    return 'follow_up';
  }
  // Legacy inspection/estimate-building stages → estimate_scheduled
  if (
    rawStage === 'inspection_scheduled' ||
    rawStage === 'inspection_completed' ||
    rawStage === 'estimate_building'
  ) {
    return 'estimate_scheduled';
  }
  // Legacy completed/active job stages → active_jobs
  if (rawStage === 'job_completed' || rawStage === 'completed') {
    return 'active_jobs';
  }
  // closed_won → contract_signed (contract_signed is now the won state)
  if (rawStage === 'closed_won') {
    return 'contract_signed';
  }

  const valid: PipelineStageId[] = [
    'cold_lead',
    'initial_call',
    'estimate_scheduled',
    'estimate_sent',
    'follow_up',
    'contract_sent',
    'contract_signed',
    'active_jobs',
    'closed_lost',
  ];
  if (rawStage && valid.includes(rawStage as PipelineStageId)) {
    return rawStage as PipelineStageId;
  }
  return 'cold_lead';
}

export function normalizeSlaStatus(status: string | undefined): 'on_track' | 'due_today' | 'overdue' {
  if (status === 'overdue' || status === 'warning') return 'overdue';
  if (status === 'due_today' || status === 'due_soon') return 'due_today';
  return 'on_track';
}
