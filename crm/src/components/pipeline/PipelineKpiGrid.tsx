import React from 'react';
import {
  DollarSign,
  Activity,
  Zap,
  Users,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { PipelineDealItem } from '@/components/pipeline/pipelineTypes';
import { PipelineSummary } from '@/api/pipelineApi';

export interface PipelineKpiGridProps {
  canViewFinances: boolean;
  totalPipelineVal: number;
  weightedForecastVal: number;
  summary: PipelineSummary | null;
  deals: PipelineDealItem[];
  closedWonDeals: PipelineDealItem[];
  stats: any;
}

export function PipelineKpiGrid({
  canViewFinances,
  totalPipelineVal,
  weightedForecastVal,
  summary,
  deals,
  closedWonDeals,
  stats,
}: PipelineKpiGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      <UniversalStatCard
        label="Active Pipeline"
        value={!canViewFinances ? '$•••' : (totalPipelineVal > 0 ? `$${(totalPipelineVal / 1000).toFixed(1)}k` : '—')}
        icon={DollarSign}
        iconGradient="from-[#1878B8] to-[#55C4F5]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft={!canViewFinances ? 'Protected' : `${deals.length} active leads`}
        footnoteRight={!canViewFinances ? 'Protected' : `${closedWonDeals.length} won`}
        sharePct={deals.length > 0 ? Math.round((deals.filter((d) => d.stageId !== 'closed_lost').length / deals.length) * 100) : 0}
        shareLabel="Active share"
        stageLabel="Active stages"
        sparklineData={stats?.sparklines?.estSent || stats?.sparklines?.newLeads}
      />

      <UniversalStatCard
        label="Weighted Forecast"
        value={!canViewFinances ? '$•••' : (weightedForecastVal > 0 ? `$${(weightedForecastVal / 1000).toFixed(1)}k` : '—')}
        deltaLabel={!canViewFinances ? 'Protected' : 'Prob-Adj'}
        icon={Activity}
        iconGradient="from-[#7c3aed] to-[#a855f7]"
        color="#8b5cf6"
        hoverBorderColor="hover:border-purple-400"
        blurColor="bg-purple-400/15 group-hover:bg-purple-400/25"
        footnoteLeft={!canViewFinances ? 'Protected' : 'Expected close'}
        footnoteRight={!canViewFinances ? 'Protected' : 'Probability weighted'}
        sharePct={totalPipelineVal > 0 ? Math.round((weightedForecastVal / totalPipelineVal) * 100) : 0}
        shareLabel="Closing probability"
        stageLabel="Weighted pipeline"
        sparklineData={stats?.sparklines?.jobsWon}
      />

      <UniversalStatCard
        label="SLA Compliance"
        value={summary?.slaHealthPct != null ? `${summary.slaHealthPct}%` : '—'}
        deltaLabel={summary?.slaHealthPct != null ? 'Healthy' : 'Loading'}
        icon={Zap}
        iconGradient="from-[#d97706] to-[#f59e0b]"
        color="#f59e0b"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        footnoteLeft="Initial call goal"
        footnoteRight="SLA on-track"
        sharePct={summary?.slaHealthPct ?? 0}
        shareLabel="Compliance rate"
        stageLabel="Stage response"
        sparklineData={stats?.sparklines?.contacted}
      />

      <UniversalStatCard
        label="Unassigned Leads"
        value={String(summary?.unassignedCount ?? deals.filter((d) => !d.estimator.name || d.estimator.name === 'Unassigned').length)}
        deltaLabel="Needs triage"
        icon={Users}
        iconGradient="from-[#ea580c] to-[#f97316]"
        color="#ea580c"
        hoverBorderColor="hover:border-orange-400"
        blurColor="bg-orange-400/15 group-hover:bg-orange-400/25"
        footnoteLeft="Awaiting estimator"
        footnoteRight="Immediate dispatch"
        sharePct={deals.length > 0 ? Math.round(((summary?.unassignedCount ?? deals.filter((d) => !d.estimator.name || d.estimator.name === 'Unassigned').length) / deals.length) * 100) : 0}
        shareLabel="Unassigned ratio"
        stageLabel="Queue health"
        sparklineData={stats?.sparklines?.newLeads}
      />

      <UniversalStatCard
        label="Closed Won Deals"
        value={String(summary?.wonCount ?? closedWonDeals.length)}
        deltaLabel="🎉 Won Contracts"
        icon={Award}
        iconGradient="from-[#059669] to-[#10b981]"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        footnoteLeft="Signed contracts"
        footnoteRight="Handoff ready"
        sharePct={deals.length > 0 ? Math.round(((summary?.wonCount ?? closedWonDeals.length) / deals.length) * 100) : 0}
        shareLabel="Win rate"
        stageLabel="Closed revenue"
        sparklineData={stats?.sparklines?.jobsWon}
      />

      <UniversalStatCard
        label="Active Jobs in Field"
        value={String(summary?.activeInstallations ?? 0)}
        deltaLabel="Production"
        icon={CheckCircle2}
        iconGradient="from-[#6366f1] to-[#8b5cf6]"
        color="#6366f1"
        hoverBorderColor="hover:border-indigo-400"
        blurColor="bg-indigo-400/15 group-hover:bg-indigo-400/25"
        footnoteLeft="Crew in progress"
        footnoteRight="Zero downtime"
        sharePct={deals.length > 0 ? Math.round(((summary?.activeInstallations ?? 0) / deals.length) * 100) : 0}
        shareLabel="Field completion"
        stageLabel="Production pipeline"
        sparklineData={stats?.sparklines?.jobsWon}
      />
    </div>
  );
}
