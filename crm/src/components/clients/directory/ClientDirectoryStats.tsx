import React from 'react';
import { Users, Building2, ShieldCheck, Flame } from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { Client360Record, isClientLost } from '@/types/client360Types';
import { ClientSummary } from '@/api/clientsApi';
import { DashboardStats } from '@/api/dashboardApi';

interface ClientDirectoryStatsProps {
  clients: Client360Record[];
  summary?: ClientSummary | null;
  stats?: DashboardStats | null;
}

export function ClientDirectoryStats({
  clients,
  summary,
  stats,
}: ClientDirectoryStatsProps) {
  const activeCount = summary?.activeProjects ?? clients.filter((c) => c.status === 'active_job' && !isClientLost(c)).length;
  const completedCount = summary?.existingClientsCount ?? clients.filter((c) => c.status === 'completed' && !isClientLost(c)).length;
  const lostCount = summary?.lostLeadsCount ?? clients.filter((c) => isClientLost(c)).length;
  const totalCount = summary?.totalClients ?? clients.filter((c) => !isClientLost(c)).length;
  const denominator = summary?.totalClients || clients.filter((c) => !isClientLost(c)).length || 1;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <UniversalStatCard
        label="Total Homeowners"
        value={totalCount}
        icon={Users}
        iconGradient="from-brand-600 to-sky-400"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft={`${activeCount} active jobs`}
        footnoteRight={`${completedCount} warrantied`}
        sharePct={100}
        shareLabel="Client directory"
        stageLabel="Homeowner Base"
        sparklineData={stats?.sparklines?.newLeads}
      />

      <UniversalStatCard
        label="Active Jobsites"
        value={activeCount}
        icon={Building2}
        iconGradient="from-emerald-600 to-emerald-400"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        footnoteLeft={`${activeCount} crews deployed`}
        footnoteRight="Work in progress"
        sharePct={clients.length > 0 ? Math.round((activeCount / denominator) * 100) : 0}
        shareLabel="Site share"
        stageLabel="Production"
        sparklineData={stats?.sparklines?.jobsWon}
      />

      <UniversalStatCard
        label="Lifetime Warrantied"
        value={completedCount}
        icon={ShieldCheck}
        iconGradient="from-teal-600 to-teal-400"
        color="#0d9488"
        hoverBorderColor="hover:border-teal-400"
        blurColor="bg-teal-400/15 group-hover:bg-teal-400/25"
        footnoteLeft="50-Yr Eagle System"
        footnoteRight={`${completedCount} certificates issued`}
        sharePct={clients.length > 0 ? Math.round((completedCount / denominator) * 100) : 0}
        shareLabel="Warranty share"
        stageLabel="Protected Roofs"
        sparklineData={stats?.sparklines?.jobsWon}
      />

      <UniversalStatCard
        label="Lost & Win-Backs"
        value={lostCount}
        icon={Flame}
        iconGradient="from-rose-600 to-rose-400"
        color="#f43f5e"
        hoverBorderColor="hover:border-rose-400"
        blurColor="bg-rose-400/15 group-hover:bg-rose-400/25"
        footnoteLeft="Win-back radar active"
        footnoteRight={`${clients.filter((c) => c.lossPostMortem?.canReactivate).length} reactivatable`}
        sharePct={clients.length > 0 ? Math.round((lostCount / denominator) * 100) : 0}
        shareLabel="Lost share"
        stageLabel="Win-Back Radar"
        sparklineData={stats?.sparklines?.lostClosed}
      />
    </div>
  );
}
