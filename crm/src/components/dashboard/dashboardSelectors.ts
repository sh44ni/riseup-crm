import { ColumnData } from './dashboardTypes';
import { DashboardStats } from '@/api/dashboardApi';

export function computeActiveStats(
  columns: ColumnData[],
  summary: { wonCount?: number; lostCount?: number; totalLeads?: number; totalPipelineValue?: number } | null,
  stats: DashboardStats | null
) {
  if (!columns || columns.length === 0) return stats;

  const newLeads = columns.find((c) => c.id === 'new_leads')?.cards.length ?? 0;
  const contacted = columns.find((c) => c.id === 'contacted')?.cards.length ?? 0;
  const estScheduled = columns.find((c) => c.id === 'est_scheduled')?.cards.length ?? 0;
  const estSent = (columns.find((c) => c.id === 'est_sent')?.cards.length ?? 0) +
                  (columns.find((c) => c.id === 'follow_up')?.cards.length ?? 0);
  const contractSent = columns.find((c) => c.id === 'contract_sent')?.cards.length ?? 0;
  const activeJobsCount = columns.find((c) => c.id === 'active_jobs')?.cards.length ?? 0;
  const wonFromSummary = summary?.wonCount ?? 0;
  const jobsWon = Math.max(activeJobsCount, wonFromSummary, stats?.jobsWon ?? 0);
  const lostClosed = summary?.lostCount ?? stats?.lostClosed ?? 0;
  const totalLeads = Math.max(
    columns.reduce((sum, col) => sum + col.cards.length, 0) + lostClosed,
    summary?.totalLeads ?? 0,
    stats?.totalLeads ?? 0
  );

  return {
    newLeads,
    newLeadsDelta: stats?.newLeadsDelta ?? null,
    contacted,
    contactedDelta: stats?.contactedDelta ?? null,
    estScheduled,
    estScheduledDelta: stats?.estScheduledDelta ?? null,
    estSent,
    estSentDelta: stats?.estSentDelta ?? null,
    contractSent,
    jobsWon,
    jobsWonDelta: stats?.jobsWonDelta ?? null,
    lostClosed,
    lostClosedDelta: stats?.lostClosedDelta ?? null,
    totalLeads,
    ytdRevenue: stats?.ytdRevenue ?? 0,
    activeCrewCount: stats?.activeCrewCount ?? 0,
    totalPipelineValue: summary?.totalPipelineValue ?? stats?.totalPipelineValue ?? 0,
    sparklines: stats?.sparklines ?? null,
    recentActivities: stats?.recentActivities ?? [],
  };
}

export function computeRepOptions(
  teamUsers: Array<{ id: string; name: string; role?: string }>,
  columns: ColumnData[]
): string[] {
  const reps = new Set<string>();
  teamUsers.forEach((u) => {
    if (u.name) reps.add(u.role ? `${u.name} (${u.role})` : u.name);
  });
  columns.forEach((col) => {
    col.cards.forEach((c) => {
      if (c.assignedToName) reps.add(c.assignedToName);
      if (c.createdByName) reps.add(c.createdByName);
    });
  });
  return ['All Reps', ...Array.from(reps)];
}
