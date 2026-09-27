import React from 'react';
import {
  MapPin,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { JobRecord } from '@/types/jobTypes';

interface JobCardProps {
  job: JobRecord;
  onClick: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const totalMilestones = job.milestones?.length || 0;
  const completedMilestones = job.milestones?.filter((m) => m.status === 'completed').length || 0;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const nextMilestone = job.milestones?.find((m) => m.status !== 'completed');

  return (
    <div
      onClick={onClick}
      className="light-glass-card glossy-sheen rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group border border-white/80 dark:border-white/10 select-none"
    >
      {/* Header: Job # + Service Type + Value */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#1878B8]/15 text-[#0284C7] dark:text-sky-400 border border-[#1878B8]/25 shadow-2xs font-mono">
              {job.job_number}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              {job.service_type || 'Roofing'}
            </span>
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-[#0284C7] dark:group-hover:text-sky-400 transition-colors mt-1.5 line-clamp-1">
            {job.customer_name}
          </h3>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
            <MapPin size={11} className="text-[#0284C7] dark:text-sky-400 shrink-0" />
            <span className="truncate">{job.address ? `${job.address}, ${job.city || ''}` : 'San Diego County, CA'}</span>
          </div>
        </div>

        <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/10 shrink-0">
          ${job.contract_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Milestones — only show if there are milestones */}
      {totalMilestones > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Milestones</span>
            <span className={`font-bold ${completedMilestones === totalMilestones ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {completedMilestones}/{totalMilestones}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextMilestone && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-600 dark:text-slate-300 font-medium truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <span className="truncate">Next: {nextMilestone.title}</span>
            </div>
          )}
          {completedMilestones === totalMilestones && (
            <div className="flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={11} />
              <span>All done</span>
            </div>
          )}
        </div>
      )}

      {/* Tap hint */}
      <div className="flex items-center justify-end text-[#0284C7] dark:text-sky-400 font-bold text-[11px] group-hover:translate-x-0.5 transition-transform pt-0.5">
        <span>Open</span>
        <ChevronRight size={13} />
      </div>
    </div>
  );
}
