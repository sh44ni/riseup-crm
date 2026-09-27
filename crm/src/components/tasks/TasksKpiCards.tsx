import React from 'react';
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';

interface TasksKpiCardsProps {
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  completedCount: number;
}

export function TasksKpiCards({
  overdueCount,
  dueTodayCount,
  upcomingCount,
  completedCount,
}: TasksKpiCardsProps) {
  const totalTasks = overdueCount + dueTodayCount + upcomingCount + completedCount;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* 1. OVERDUE */}
      <UniversalStatCard
        label="Overdue"
        value={overdueCount}
        delta={overdueCount > 0 ? -overdueCount : 0}
        deltaLabel={overdueCount > 0 ? `${overdueCount} Action Req.` : '0 Overdue'}
        icon={AlertCircle}
        iconGradient="from-rose-600 to-rose-400"
        color="#f43f5e"
        hoverBorderColor="hover:border-rose-400"
        blurColor="bg-rose-400/15 group-hover:bg-rose-400/25"
        footnoteLeft="Action needed"
        footnoteRight={
          <span className={overdueCount > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-700 dark:text-emerald-400 font-bold'}>
            {overdueCount > 0 ? `${overdueCount} Pending` : '0 Pending'}
          </span>
        }
        sharePct={totalTasks > 0 ? Math.round((overdueCount / totalTasks) * 100) : 0}
        shareLabel="Backlog share"
        stageLabel="Action Required"
      />

      {/* 2. DUE TODAY */}
      <UniversalStatCard
        label="Due Today"
        value={dueTodayCount}
        deltaLabel="Today's Agenda"
        icon={Clock}
        iconGradient="from-amber-600 to-amber-400"
        color="#f59e0b"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        footnoteLeft="Daily follow-ups"
        footnoteRight={
          <span className="text-amber-700 dark:text-amber-400 font-bold">
            {dueTodayCount > 0 ? `${dueTodayCount} Scheduled` : 'All Clear'}
          </span>
        }
        sharePct={totalTasks > 0 ? Math.round((dueTodayCount / totalTasks) * 100) : 0}
        shareLabel="Daily volume"
        stageLabel="Active Today"
      />

      {/* 3. UPCOMING */}
      <UniversalStatCard
        label="Upcoming"
        value={upcomingCount}
        deltaLabel="Next 7 Days"
        icon={Calendar}
        iconGradient="from-[#1878B8] to-[#55C4F5]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft="Next 7 days"
        footnoteRight={
          <span className="text-[#0284c7] dark:text-sky-400 font-bold">
            {upcomingCount > 0 ? 'Active Pipeline' : 'Queue Clear'}
          </span>
        }
        sharePct={totalTasks > 0 ? Math.round((upcomingCount / totalTasks) * 100) : 0}
        shareLabel="Future share"
        stageLabel="Scheduled"
      />

      {/* 4. COMPLETED */}
      <UniversalStatCard
        label="Completed"
        value={completedCount}
        deltaLabel={`${completionRate}% Done`}
        icon={CheckCircle2}
        iconGradient="from-emerald-600 to-emerald-400"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        footnoteLeft={`${completionRate}% completion rate`}
        footnoteRight={<span className="text-emerald-700 dark:text-emerald-400 font-bold">Resolved</span>}
        sharePct={completionRate}
        shareLabel="Completion"
        stageLabel="Resolved"
      />
    </div>
  );
}
