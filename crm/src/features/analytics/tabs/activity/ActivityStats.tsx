import { useEffect, useState } from 'react';
import { Activity, PlusCircle, Pencil, Trash2, Users } from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { activityApi } from './api';
import type { ActivitySummary } from './types';

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Headline numbers for the last 7 days, using the same stat cards as the rest of the CRM. */
export function ActivityStats() {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);

  useEffect(() => {
    activityApi.summary(7).then(setSummary).catch(() => setSummary(null));
  }, []);

  const isLoading = summary === null;
  const s = summary;
  const series = (key: 'events' | 'creates' | 'updates' | 'deletes') => s?.daily.map((d) => d[key]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" data-testid="activity-stats">
      <UniversalStatCard
        label="Total Events"
        value={s?.events ?? 0}
        isLoading={isLoading}
        delta={s ? pctDelta(s.events, s.previous_events) : null}
        icon={Activity}
        sparklineData={series('events')}
        footnoteLeft="Last 7 days"
        footnoteRight={s ? `${s.previous_events} prior` : undefined}
        sharePct={s && s.events + s.previous_events > 0 ? (s.events / (s.events + s.previous_events)) * 100 : 0}
        shareLabel="Share of 14 days"
        thisPeriodText={s?.events}
        priorValueText={s?.previous_events}
        stageLabel="All activity"
      />
      <UniversalStatCard
        label="Records Created"
        value={s?.creates ?? 0}
        isLoading={isLoading}
        deltaLabel="New records"
        icon={PlusCircle}
        iconGradient="from-emerald-600 to-emerald-400"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        sparklineData={series('creates')}
        footnoteLeft="Clients, jobs, estimates…"
        sharePct={s && s.events > 0 ? (s.creates / s.events) * 100 : 0}
        shareLabel="Of all events"
        stageLabel="Created"
      />
      <UniversalStatCard
        label="Edits"
        value={s?.updates ?? 0}
        isLoading={isLoading}
        deltaLabel="Field changes"
        icon={Pencil}
        iconGradient="from-amber-600 to-amber-400"
        color="#f59e0b"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        sparklineData={series('updates')}
        footnoteLeft="Contact, status, assignment"
        sharePct={s && s.events > 0 ? (s.updates / s.events) * 100 : 0}
        shareLabel="Of all events"
        stageLabel="Updated"
      />
      <UniversalStatCard
        label="Deletions"
        value={s?.deletes ?? 0}
        isLoading={isLoading}
        deltaLabel={s && s.deletes > 0 ? 'Review' : 'None'}
        icon={Trash2}
        iconGradient="from-rose-600 to-rose-400"
        color="#f43f5e"
        hoverBorderColor="hover:border-rose-400"
        blurColor="bg-rose-400/15 group-hover:bg-rose-400/25"
        sparklineData={series('deletes')}
        footnoteLeft={s ? `${s.active_employees} active staff` : undefined}
        footnoteRight={<Users size={10} className="text-slate-400" />}
        sharePct={s && s.events > 0 ? (s.deletes / s.events) * 100 : 0}
        shareLabel="Of all events"
        stageLabel="Removed"
      />
    </div>
  );
}
