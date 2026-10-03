import React from 'react';
import { ViewToggle } from '@/components/common/ViewToggle';

export type DirectoryFilterType = 'all' | 'active_job' | 'completed' | 'closed_lost';

interface ClientDirectoryToolbarProps {
  directoryFilter: DirectoryFilterType;
  onFilterChange: (filter: DirectoryFilterType) => void;
  counts: {
    all: number;
    active_job: number;
    completed: number;
    closed_lost: number;
  };
  directoryDisplayMode: 'table' | 'cards';
  onDisplayModeChange: (mode: 'table' | 'cards') => void;
}

export function ClientDirectoryToolbar({
  directoryFilter,
  onFilterChange,
  counts,
  directoryDisplayMode,
  onDisplayModeChange,
}: ClientDirectoryToolbarProps) {
  const filterOptions = [
    { id: 'all' as const, label: 'All Records', count: counts.all },
    { id: 'active_job' as const, label: 'Active Jobsites', count: counts.active_job },
    { id: 'completed' as const, label: 'Completed', count: counts.completed },
    { id: 'closed_lost' as const, label: 'Closed Lost & Win-Backs', count: counts.closed_lost },
  ];

  return (
    <div className="light-glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              directoryFilter === f.id
                ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                directoryFilter === f.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <ViewToggle
        viewMode={directoryDisplayMode}
        onViewModeChange={onDisplayModeChange}
      />
    </div>
  );
}
