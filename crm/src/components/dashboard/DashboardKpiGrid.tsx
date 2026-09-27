import React from 'react';
import { Users, Phone, Calendar, FileText, Trophy, AlertCircle } from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';

export function KpiCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="light-glass-card glossy-sheen rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 animate-pulse" />
        <div className="w-12 h-4 rounded-full bg-slate-200/50 dark:bg-slate-800/60 animate-pulse" />
      </div>
      <div className="flex items-end justify-between mt-2">
        <div className="space-y-1.5">
          <div className="w-10 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 animate-pulse" />
          <div className="w-14 h-2.5 rounded bg-slate-200/50 dark:bg-slate-800/60 animate-pulse" />
        </div>
        <div className="w-16 h-7 rounded-lg bg-slate-200/40 dark:bg-slate-800/50 animate-pulse" />
      </div>
      <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-white/10 flex items-center justify-between">
        <div className="w-12 h-2 rounded bg-slate-200/40 dark:bg-slate-800/60 animate-pulse" />
        <div className="w-12 h-1 rounded-full bg-slate-200/40 dark:bg-slate-800/60 animate-pulse" />
      </div>
    </div>
  );
}

export interface DashboardKpiGridProps {
  isLoading: boolean;
  activeStats: any;
  stats: any;
}

export function DashboardKpiGrid({ isLoading, activeStats, stats }: DashboardKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-6 gap-2 shrink-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} delay={i * 80} />
        ))}
      </div>
    );
  }

  const totalLeads = Math.max(activeStats?.totalLeads ?? 1, 1);
  const cardPct = (val: number | undefined) => Math.min(100, Math.round(((val ?? 0) / totalLeads) * 100));

  return (
    <div className="grid grid-cols-6 gap-2 shrink-0">
      {/* 1: New Leads */}
      <UniversalStatCard
        label="New Leads"
        value={activeStats?.newLeads ?? 0}
        delta={activeStats?.newLeadsDelta}
        icon={Users}
        iconGradient="from-[#1878B8] to-[#55C4F5]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft="vs last month"
        stageLabel="Unworked leads"
        sparklineData={stats?.sparklines?.newLeads}
        sharePct={cardPct(activeStats?.newLeads)}
      />

      {/* 2: Connected */}
      <UniversalStatCard
        label="Connected"
        value={activeStats?.contacted ?? 0}
        delta={activeStats?.contactedDelta}
        icon={Phone}
        iconGradient="from-[#0284C7] to-[#38BDF8]"
        color="#06b6d4"
        hoverBorderColor="hover:border-cyan-400"
        blurColor="bg-cyan-400/15 group-hover:bg-cyan-400/25"
        footnoteLeft="High pick-up"
        stageLabel="Initial outreach"
        sparklineData={stats?.sparklines?.contacted}
        sharePct={cardPct(activeStats?.contacted)}
      />

      {/* 3: Est. Scheduled */}
      <UniversalStatCard
        label="Est. Scheduled"
        value={activeStats?.estScheduled ?? 0}
        delta={activeStats?.estScheduledDelta}
        icon={Calendar}
        iconGradient="from-purple-600 to-purple-400"
        color="#9333ea"
        hoverBorderColor="hover:border-purple-400"
        blurColor="bg-purple-400/15 group-hover:bg-purple-400/25"
        footnoteLeft="On-site walks"
        stageLabel="On-site estimates"
        sparklineData={stats?.sparklines?.estScheduled}
        sharePct={cardPct(activeStats?.estScheduled)}
      />

      {/* 4: Est. Sent */}
      <UniversalStatCard
        label="Est. Sent"
        value={activeStats?.estSent ?? 0}
        delta={activeStats?.estSentDelta}
        icon={FileText}
        iconGradient="from-amber-500 to-amber-400"
        color="#f59e0b"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        footnoteLeft="Proposals live"
        stageLabel="Proposals pending"
        sparklineData={stats?.sparklines?.estSent}
        sharePct={cardPct(activeStats?.estSent)}
      />

      {/* 5: Jobs Won */}
      <UniversalStatCard
        label="Jobs Won"
        value={activeStats?.jobsWon ?? 0}
        delta={activeStats?.jobsWonDelta}
        icon={Trophy}
        iconGradient="from-emerald-600 to-emerald-400"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/18 group-hover:bg-emerald-400/28"
        footnoteLeft="Closed & signed"
        stageLabel="Contracts signed"
        sparklineData={stats?.sparklines?.jobsWon}
        sharePct={cardPct(activeStats?.jobsWon)}
      />

      {/* 6: Lost / Closed */}
      <UniversalStatCard
        label="Lost / Closed"
        value={activeStats?.lostClosed ?? 0}
        delta={activeStats?.lostClosedDelta}
        icon={AlertCircle}
        iconGradient="from-rose-500 to-rose-400"
        color="#f43f5e"
        hoverBorderColor="hover:border-rose-400"
        blurColor="bg-rose-400/12 group-hover:bg-rose-400/22"
        footnoteLeft="Pricing / Delays"
        stageLabel="Churned leads"
        sparklineData={stats?.sparklines?.lostClosed}
        sharePct={cardPct(activeStats?.lostClosed)}
      />
    </div>
  );
}
