export type DateRangeFilter =
  | 'last_30_days'
  | 'this_quarter'
  | 'ytd'
  | 'last_year';

export type ReportTab =
  | 'revenue'
  | 'sales_reps';

export interface RevenueDataPoint {
  month: string;
  shortMonth: string;
  revenue: number;
  target: number;
  bookedJobs: number;
  avgTicket: number;
}

export interface MaterialRevenueSplit {
  category: string;
  name: string;
  revenue: number;
  percentage: number;
  color: string;
  squaresCount: number;
}

export interface LeadSourceMetric {
  source: string;
  channelName: string;
  leadsCount: number;
  wonCount: number;
  winRate: number; // percentage
  cac: number; // customer acquisition cost in $
  totalRevenue: number;
  roiMultiple: number; // e.g. 11.2x
}

export interface SalesRepPerformance {
  repId: string;
  name: string;
  role: string;
  initials: string;
  quotedAmount: number;
  closedAmount: number;
  wonJobs: number;
  winRate: number;
  avgTicket: number;
  commissionEarned: number;
  avatarColor: string;
  badge?: string;
}

export interface ExecutiveInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'achievement';
  title: string;
  impact: string;
  recommendation: string;
  category: string;
}

export interface SpeedToLeadBucket {
  window: string;
  rate: number; // close rate percentage
  leadsCount?: number;
  wonCount?: number;
  percentage?: number; // share of total leads
  color: string;
  note?: string;
}

export interface SpeedToLeadDistributionResponse {
  avgSpeedMinutes: number;
  totalContacted: number;
  slaCompliancePct: number;
  distribution: SpeedToLeadBucket[];
}

export function dateRangeToDates(range?: string): { from?: string; to?: string } {
  const now = new Date();
  const year = now.getFullYear();
  switch (range) {
    case 'last_30_days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { from: `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`, to: now.toISOString().slice(0, 10) };
    }
    case 'last_year':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case 'ytd':
    default:
      return { from: `${year}-01-01`, to: now.toISOString().slice(0, 10) };
  }
}
