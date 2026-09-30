import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Mail,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { type RecentActivityItem } from '@/api/dashboardApi';

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'just now';
    const now = Date.now();
    const diffMs = now - d.getTime();
    if (diffMs < 0) return 'just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return 'just now';
  }
}

export function ActivityItemCard({ activity }: { activity: RecentActivityItem }) {
  const type = activity.activity_type;
  const userName = (activity.user_name || activity.performed_by || 'Staff').split(' ')[0];
  const targetName = activity.target_name || activity.metadata?.lead_name || activity.metadata?.customer_name || 'Client';
  const amount = activity.amount ?? activity.metadata?.amount ?? activity.metadata?.contract_value;
  const formattedAmount = amount && Number(amount) > 0 ? `$${Number(amount).toLocaleString()}` : null;
  const timeStr = formatRelativeTime(activity.created_at);

  if (type === 'lead_created' || type === 'lead_added') {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-lg liquid-glass-tile text-xs min-w-0">
        <div className="w-5 h-5 rounded-md bg-sky-100/90 text-[#1878B8] flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-xs">
          <Users size={11} />
        </div>
        <div className="truncate text-[10px]">
          <span className="text-slate-600 dark:text-slate-300">{userName} added lead <strong className="text-[#1F1F1F] dark:text-white">{targetName}</strong></span>
          <span className="text-slate-400 ml-1.5 font-medium shrink-0">{timeStr}</span>
        </div>
      </div>
    );
  }

  if (type === 'lead_claimed') {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-lg liquid-glass-tile text-xs min-w-0">
        <div className="w-5 h-5 rounded-md bg-indigo-100/90 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-xs">
          <UserCheck size={11} />
        </div>
        <div className="truncate text-[10px]">
          <span className="text-slate-600 dark:text-slate-300">{userName} claimed lead <strong className="text-[#1F1F1F] dark:text-white">{targetName}</strong></span>
          <span className="text-slate-400 ml-1.5 font-medium shrink-0">{timeStr}</span>
        </div>
      </div>
    );
  }

  if (type === 'estimate_sent' || type === 'proposal_sent') {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-lg liquid-glass-tile text-xs min-w-0">
        <div className="w-5 h-5 rounded-md bg-blue-100/90 text-[#0284C7] flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-xs">
          <Mail size={11} />
        </div>
        <div className="truncate text-[10px]">
          <span className="text-slate-600 dark:text-slate-300">Sent to <strong className="text-[#1F1F1F] dark:text-white">{targetName}</strong>{formattedAmount ? ` ${formattedAmount}` : ''}</span>
          <span className="text-slate-400 ml-1.5 font-medium shrink-0">{timeStr}</span>
        </div>
      </div>
    );
  }

  if (type === 'contract_signed') {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-lg liquid-glass-tile text-xs min-w-0">
        <div className="w-5 h-5 rounded-md bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-xs">
          <FileText size={11} />
        </div>
        <div className="truncate text-[10px]">
          <span className="text-slate-600 dark:text-slate-300">Contract signed <strong className="text-[#1F1F1F] dark:text-white">{targetName}</strong></span>
          <span className="text-slate-400 ml-1.5 font-medium shrink-0">{timeStr}</span>
        </div>
      </div>
    );
  }

  if (type === 'job_completed' || type === 'completed') {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-lg liquid-glass-tile text-xs min-w-0">
        <div className="w-5 h-5 rounded-md bg-teal-100/90 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-xs">
          <CheckCircle2 size={11} />
        </div>
        <div className="truncate text-[10px]">
          <span className="text-slate-600 dark:text-slate-300">Job completed <strong className="text-[#1F1F1F] dark:text-white">{targetName}</strong></span>
          <span className="text-slate-400 ml-1.5 font-medium shrink-0">{timeStr}</span>
        </div>
      </div>
    );
  }

  // Generic fallback for notes, calls, touchpoints
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg liquid-glass-tile text-xs min-w-0">
      <div className="w-5 h-5 rounded-md bg-slate-100/90 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-xs">
        <Clock size={11} />
      </div>
      <div className="truncate text-[10px]">
        <span className="text-slate-600 dark:text-slate-300">{userName} updated <strong className="text-[#1F1F1F] dark:text-white">{targetName}</strong></span>
        <span className="text-slate-400 ml-1.5 font-medium shrink-0">{timeStr}</span>
      </div>
    </div>
  );
}

export interface DashboardRecentActivityProps {
  recentActivities?: RecentActivityItem[];
}

export function DashboardRecentActivity({ recentActivities = [] }: DashboardRecentActivityProps) {
  return (
    <div className="rounded-xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs px-3 py-1.5 flex items-center justify-between gap-3 shrink-0">
      {/* Title */}
      <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-slate-200/70 dark:border-white/10">
        <Clock size={13} className="text-[#1878B8]" />
        <span className="text-xs font-bold text-[#1F1F1F] dark:text-white">Recent Activity</span>
      </div>

      {/* Activity Items Horizontal Row */}
      <div className="flex-1 grid grid-cols-4 gap-2">
        {recentActivities && recentActivities.length > 0 ? (
          <>
            {recentActivities.slice(0, 4).map((act, idx) => (
              <ActivityItemCard key={act.id || idx} activity={act} />
            ))}
            {Array.from({ length: Math.max(0, 4 - recentActivities.length) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="hidden md:flex items-center gap-2 p-1.5 rounded-lg border border-dashed border-slate-200/60 dark:border-white/10 text-[10px] text-slate-400 justify-center"
              >
                <Clock size={10} className="text-slate-300 dark:text-slate-600" />
                <span>Awaiting activity...</span>
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-4 flex items-center justify-center py-0.5 text-[11px] text-slate-400 font-medium">
            <Clock size={11} className="mr-1.5 text-[#1878B8]" />
            <span>No team activities logged yet. Real-time actions will appear here.</span>
          </div>
        )}
      </div>

      {/* View All Link */}
      <Link
        to="/leads"
        className="text-[11px] font-bold text-[#1878B8] hover:text-[#55C4F5] hover:underline flex items-center gap-0.5 shrink-0 pl-2"
      >
        <span>View All</span>
        <ArrowUpRight size={11} />
      </Link>
    </div>
  );
}
