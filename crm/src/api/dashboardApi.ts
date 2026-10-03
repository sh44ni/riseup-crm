import { httpClient } from '@/shared/api/client';

export interface RecentActivityItem {
  id: number;
  activity_type: string;
  title: string;
  description?: string | null;
  performed_by?: string | null;
  user_name?: string | null;
  entity_type: string;
  entity_id?: number | null;
  target_name?: string | null;
  amount?: number | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface DashboardStats {
  newLeads: number;
  newLeadsDelta: number | null;
  contacted: number;
  contactedDelta: number | null;
  estScheduled: number;
  estScheduledDelta: number | null;
  estSent: number;
  estSentDelta: number | null;
  jobsWon: number;
  jobsWonDelta: number | null;
  lostClosed: number;
  lostClosedDelta: number | null;
  ytdRevenue: number;
  activeCrewCount: number;
  totalLeads: number;
  totalPipelineValue: number;
  sparklines?: {
    newLeads: number[];
    contacted: number[];
    estScheduled: number[];
    estSent: number[];
    jobsWon: number[];
    lostClosed: number[];
  } | null;
  recentActivities?: RecentActivityItem[];
}

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  try {
    const json = await httpClient.get<{ ok?: boolean; stats?: DashboardStats }>('/admin/dashboard', { timeoutMs: 5000 });
    if (!json?.ok || !json?.stats) return null;
    return json.stats as DashboardStats;
  } catch {
    return null;
  }
}
