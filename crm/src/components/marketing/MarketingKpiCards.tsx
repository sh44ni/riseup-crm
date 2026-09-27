import React from 'react';
import { Eye, Users, PhoneCall, Target, Activity } from 'lucide-react';
import type { MarketingAnalyticsData } from '@/types/marketingTypes';
import { UniversalStatCard, StatSkeleton } from '@/components/common/UniversalStatCard';

interface MarketingKpiCardsProps {
  data: MarketingAnalyticsData | null;
  loading?: boolean;
}

export const MarketingKpiCards: React.FC<MarketingKpiCardsProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="light-glass-card dark:bg-slate-900/60 dark:border-white/10 glossy-sheen rounded-xl p-2.5 flex flex-col justify-between h-[104px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
              <div className="w-10 h-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
            </div>
            <div className="space-y-1 mt-2">
              <div className="w-12 h-6 rounded bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
              <div className="w-16 h-3 rounded bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const {
    totalPageviews,
    uniqueVisitors,
    totalSessions,
    bounceRate,
    avgDurationMs,
    avgScrollDepth,
    totalCalls,
    callConversionRate,
    websiteLeadsCount,
    conversionRate,
  } = data;

  const pageviewsTimeline = data.timeline?.map(t => t.pageviews) || [];
  const sessionsTimeline = data.timeline?.map(t => t.sessions) || [];

  const durationSec = Math.round((avgDurationMs || 0) / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const durationRemainderSec = durationSec % 60;
  const durationFormatted = durationMin > 0 ? `${durationMin}m ${durationRemainderSec}s` : `${durationSec}s`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {/* 1. Total Pageviews */}
      <UniversalStatCard
        label="Total Pageviews"
        value={totalPageviews.toLocaleString()}
        icon={Eye}
        iconGradient="from-[#1878B8] to-[#55C4F5]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        deltaLabel={`${totalSessions > 0 ? (totalPageviews / totalSessions).toFixed(1) : '1.0'} pv/sess`}
        footnoteLeft={`${totalSessions.toLocaleString()} sessions`}
        footnoteRight="Gross views"
        stageLabel="Total website traffic volume"
        thisPeriodText={`${totalPageviews.toLocaleString()} views`}
        sharePct={100}
        shareLabel="Traffic share"
        sparklineData={pageviewsTimeline}
      />

      {/* 2. Unique Visitors */}
      <UniversalStatCard
        label="Unique Visitors"
        value={uniqueVisitors.toLocaleString()}
        icon={Users}
        iconGradient="from-[#0284C7] to-[#38BDF8]"
        color="#06b6d4"
        hoverBorderColor="hover:border-cyan-400"
        blurColor="bg-cyan-400/15 group-hover:bg-cyan-400/25"
        deltaLabel="Verified"
        footnoteLeft="Telemetry ID"
        footnoteRight="Distinct users"
        stageLabel="Distinct visitor profiles"
        thisPeriodText={`${uniqueVisitors.toLocaleString()} visitors`}
        sharePct={totalSessions > 0 ? Math.min(100, Math.round((uniqueVisitors / totalSessions) * 100)) : 0}
        shareLabel="Session ratio"
        sparklineData={pageviewsTimeline}
      />

      {/* 3. Bounce Rate */}
      <UniversalStatCard
        label="Bounce Rate"
        value={`${bounceRate}%`}
        icon={Activity}
        iconGradient="from-[#7c3aed] to-[#a855f7]"
        color="#7c3aed"
        hoverBorderColor="hover:border-purple-400"
        blurColor="bg-purple-400/15 group-hover:bg-purple-400/25"
        deltaLabel={bounceRate < 50 ? 'Strong' : 'Normal'}
        footnoteLeft={`Time: ${durationFormatted}`}
        footnoteRight={`Scroll ${avgScrollDepth}%`}
        stageLabel="Single-pageview visitor drop-off"
        thisPeriodText={`${bounceRate}% rate`}
        sharePct={bounceRate}
        shareLabel="Bounce share"
      />

      {/* 4. Calls Clicked */}
      <UniversalStatCard
        label="Calls Clicked"
        value={totalCalls.toLocaleString()}
        icon={PhoneCall}
        iconGradient="from-[#059669] to-[#34d399]"
        color="#059669"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        deltaLabel={`${callConversionRate}% Conv`}
        footnoteLeft="Inbound phone dials"
        footnoteRight="High Intent"
        stageLabel="Direct telephone link clicks"
        thisPeriodText={`${totalCalls} calls`}
        sharePct={Math.min(100, Math.round(callConversionRate * 10))}
        shareLabel="Conversion share"
        sparklineData={sessionsTimeline}
      />

      {/* 5. Website Leads */}
      <UniversalStatCard
        label="Website Leads"
        value={websiteLeadsCount.toLocaleString()}
        icon={Target}
        iconGradient="from-[#d97706] to-[#fbbf24]"
        color="#d97706"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        deltaLabel={`${conversionRate}% Form`}
        footnoteLeft="Estimate & Contact forms"
        footnoteRight="View Leads →"
        stageLabel="Submissions converted to CRM leads"
        thisPeriodText={`${websiteLeadsCount} leads`}
        sharePct={Math.min(100, Math.round(conversionRate * 10))}
        shareLabel="Lead conversion"
        sparklineData={sessionsTimeline}
        onClick={() => {
          window.location.href = '/leads';
        }}
        className="cursor-pointer"
      />
    </div>
  );
};
