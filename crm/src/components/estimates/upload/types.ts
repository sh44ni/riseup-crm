export interface Lead {
  id: number;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  zip?: string;
  pipeline_stage?: string;
  status?: string;
  client_360_address?: string;
  client_360_city?: string;
  client_360_zip?: string;
}

export interface SelectedLead {
  id: number;
  name: string;
  phone: string;
  email: string;
  property: string;
  stage: string;
}

export interface SentResult {
  estimateNumber: string;
  simulated: boolean;
  message: string;
}

export const STAGE_PRIORITY: Record<string, number> = {
  est_scheduled: 1,
  estimate_scheduled: 1,
  inspection_scheduled: 1,
  inspection_completed: 1,
  estimate_building: 1,
  stage_3_site_visit_estimate: 1,
  estimate_sent: 2,
  follow_up: 2,
  initial_call: 3,
  cold_lead: 4,
};

export const STAGE_LABELS: Record<string, string> = {
  estimate_scheduled: 'Estimate Scheduled',
  est_scheduled: 'Estimate Scheduled',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_completed: 'Inspection Done',
  estimate_building: 'Building Estimate',
  estimate_sent: 'Estimate Sent',
  follow_up: 'Follow Up',
  initial_call: 'Initial Call',
  cold_lead: 'Cold Lead',
};

export const stageLabel = (stage?: string) =>
  STAGE_LABELS[stage || ''] || (stage || '').replace(/_/g, ' ');

export const stageBadgeClass = (stage: string) => {
  const p = STAGE_PRIORITY[stage] ?? 10;
  if (p === 1)
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
  if (p === 2)
    return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10';
};
