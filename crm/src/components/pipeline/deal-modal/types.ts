import { EnrichedDeal, PipelineDealItem } from '../pipelineTypes';

export interface GenericDealItem {
  id: string | number;
  name: string;
  customerName?: string;
  location?: string;
  address?: string;
  city?: string;
  zip?: string;
  service?: string;
  serviceColor?: string;
  time?: string;
  phone?: string;
  email?: string;
  value?: number;
  contractValue?: number | null;
  estimateTotal?: number | null;
  estimatedValue?: number | null;
  roofSqf?: number | null;
  roof_sqf?: number | null;
  proposalSentAt?: string | null;
  proposalSentDate?: string | null;
  isUploadedEstimate?: boolean;
  estimateTemplateKey?: string | null;
  isContractSigned?: boolean;
  stageTitle?: string;
  stagePillClass?: string;
  stageId?: string;
  dateFormatted?: string;
  timeSlot?: string;
  notes?: string;
  daysInStage?: number;
  score?: number;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  siteVisitScheduledAt?: string | null;
  clientId?: number | string | null;
  client_id?: number | string | null;
  leadSource?: string;
  leadSourceDetail?: string;
  sourceType?: string;
  createdByName?: string | null;
  estimator?: {
    name?: string;
    avatar?: string;
    role?: string;
  };
}

export type ModalDeal = GenericDealItem | EnrichedDeal | PipelineDealItem;

export const STAGE_TITLES: Record<string, string> = {
  stage_1_lead_gen: 'New Lead',
  stage_2_initial_contact: 'Initial Contact',
  stage_3_site_visit_estimate: 'Estimate Scheduled',
  stage_4_closing: 'Closing & Follow-Up',
  stage_5_completion_followup: 'Active Job & Fulfillment',
  cold_lead: 'Cold Lead',
  new_leads: 'New Lead',
  initial_call: 'Contacted / Initial Call',
  contacted: 'Contacted',
  inspection_scheduled: 'Inspection Scheduled',
  est_scheduled: 'Estimate Scheduled',
  inspection_completed: 'Inspection Completed',
  estimate_building: 'Drafting Estimate',
  estimate_sent: 'Estimate Sent',
  est_sent: 'Estimate Sent',
  follow_up: 'Follow-Up',
  followup_2day: '48h Follow-Up',
  followup_7day: '7-Day Follow-Up',
  contract_signed: 'Contract Signed',
  active_jobs: 'Active Job',
  job_completed: 'Job Completed',
  completed: 'Job Completed',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  future_followup: 'Future Follow-Up',
};

export const DEFAULT_BADGE_CLASS = (color?: string) => {
  switch (color) {
    case 'amber':
      return 'bg-amber-100/90 text-amber-800 border border-amber-200';
    case 'blue':
      return 'bg-blue-100/90 text-blue-800 border border-blue-200';
    case 'sky':
      return 'bg-sky-100/90 text-sky-800 border border-sky-200';
    case 'coral':
      return 'bg-rose-100/90 text-rose-800 border border-rose-200';
    case 'indigo':
      return 'bg-indigo-100/90 text-indigo-800 border border-indigo-200';
    case 'purple':
      return 'bg-purple-100/90 text-purple-800 border border-purple-200';
    default:
      return 'bg-emerald-100/90 text-emerald-800 border border-emerald-200';
  }
};

export function formatRelativeTime(dateStr?: string | null): string {
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
