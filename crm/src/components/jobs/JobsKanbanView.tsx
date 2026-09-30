import React from 'react';
import { JobRecord } from '@/types/jobTypes';
import { JobCard } from './JobCard';
import { Clock, Hammer, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface JobsKanbanViewProps {
  jobs: JobRecord[];
  onSelectJob: (job: JobRecord) => void;
}

interface ColumnConfig {
  id: string;
  title: string;
  icon: any;
  color: string;
  filter: (job: JobRecord) => boolean;
}

export function JobsKanbanView({ jobs, onSelectJob }: JobsKanbanViewProps) {
  const columns: ColumnConfig[] = [
    {
      id: 'scheduled',
      title: 'Scheduled / Planned',
      icon: Clock,
      color: 'sky',
      filter: (j) => j.status === 'scheduled' || (!j.status && j.status !== 'complete'),
    },
    {
      id: 'in_progress',
      title: 'In Progress (Active Work)',
      icon: Hammer,
      color: 'amber',
      filter: (j) => j.status === 'in_progress' || j.status === 'active',
    },
    {
      id: 'punch_list',
      title: 'Quality & Touchups',
      icon: ShieldCheck,
      color: 'purple',
      filter: (j) => (j as any).status === 'punch_list' || (j as any).status === 'final_inspection',
    },
    {
      id: 'complete',
      title: 'Completed & Warrantied',
      icon: CheckCircle2,
      color: 'emerald',
      filter: (j) => j.status === 'complete',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {columns.map((col) => {
        const colJobs = jobs.filter(col.filter);
        const colTotalValue = colJobs.reduce((sum, j) => sum + (j.contract_value || 0), 0);
        const Icon = col.icon;

        return (
          <div
            key={col.id}
            className="liquid-column-channel rounded-2xl p-3.5 flex flex-col gap-3 min-h-[500px] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-[#0A101C]/60 backdrop-blur-xl"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-2xs font-bold ${
                    col.color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : col.color === 'amber'
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-400'
                      : col.color === 'purple'
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                      : 'bg-sky-500/20 text-sky-700 dark:text-sky-400'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{col.title}</h4>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    ${colTotalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 shadow-2xs">
                {colJobs.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-3">
              {colJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => onSelectJob(job)} />
              ))}

              {colJobs.length === 0 && (
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-300/80 dark:border-white/10 bg-white/20 dark:bg-white/5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No work orders in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
