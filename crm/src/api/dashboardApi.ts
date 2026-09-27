import { api, API_ORIGIN } from '@/lib/api';

const BASE = API_ORIGIN;

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
  metadata?: Record<string, any> | null;
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
    const res = await fetch(`${BASE}/api/admin/dashboard`, {
      headers: api.getAuthHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json?.stats) return null;
    return json.stats as DashboardStats;
  } catch {
    return null;
  }
}
