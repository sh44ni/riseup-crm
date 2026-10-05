import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Check } from 'lucide-react';
import { ViewToggle } from '@/components/common/ViewToggle';
import { ClientSortConfig, SortDirection } from '@/types/client360Types';
import { CLIENT_SORT_OPTIONS } from '@/utils/clientSortUtils';

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
  sortConfig: ClientSortConfig;
  onSortChange: (config: ClientSortConfig) => void;
}

export function ClientDirectoryToolbar({
  directoryFilter,
  onFilterChange,
  counts,
  directoryDisplayMode,
  onDisplayModeChange,
  sortConfig,
  onSortChange,
}: ClientDirectoryToolbarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions = [
    { id: 'all' as const, label: 'All Records', count: counts.all },
    { id: 'active_job' as const, label: 'Active Jobsites', count: counts.active_job },
    { id: 'completed' as const, label: 'Completed', count: counts.completed },
    { id: 'closed_lost' as const, label: 'Closed Lost', count: counts.closed_lost },
  ];

  const activeOption =
    CLIENT_SORT_OPTIONS.find((opt) => opt.id === sortConfig.field) || CLIENT_SORT_OPTIONS[0];

  const toggleDirection = () => {
    const nextDirection: SortDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ ...sortConfig, direction: nextDirection });
  };

  return (
    <div className="light-glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs relative z-30">
      {/* Stage / Status Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            data-testid={`client-filter-${f.id}`}
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

      {/* Directory Sort & View Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort Controls Group */}
        <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
          {/* Field Selection Dropdown */}
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              data-testid="client-sort-dropdown-btn"
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-expanded={isSortOpen}
              aria-haspopup="listbox"
              title={`Currently sorted by ${activeOption.label}. Click to choose field.`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700/80 transition-all cursor-pointer select-none"
            >
              <ArrowUpDown size={13} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
              <span className="text-slate-400 dark:text-slate-400 font-medium hidden sm:inline">Sort:</span>
              <span className="truncate max-w-[120px] sm:max-w-[140px]">{activeOption.label}</span>
              <ChevronDown
                size={12}
                className={`text-slate-400 transition-transform duration-150 ${isSortOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isSortOpen && (
              <div
                role="listbox"
                className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 z-50 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xl p-1.5 space-y-0.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  Sort Directory By
                </div>
                {CLIENT_SORT_OPTIONS.map((opt) => {
                  const isSelected = sortConfig.field === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`client-sort-opt-${opt.id}`}
                      onClick={() => {
                        onSortChange({ ...sortConfig, field: opt.id });
                        setIsSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <Check size={12} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Ascending / Descending Direction Toggle */}
          <button
            type="button"
            data-testid="client-sort-direction-btn"
            onClick={toggleDirection}
            title={
              sortConfig.direction === 'asc'
                ? `Ascending (${activeOption.ascLabel}). Click for Descending.`
                : `Descending (${activeOption.descLabel}). Click for Ascending.`
            }
            aria-label={`Sort direction: ${sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700/80 transition-all cursor-pointer select-none"
          >
            {sortConfig.direction === 'asc' ? (
              <>
                <ArrowUp size={13} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {activeOption.ascLabel}
                </span>
              </>
            ) : (
              <>
                <ArrowDown size={13} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {activeOption.descLabel}
                </span>
              </>
            )}
          </button>
        </div>

        {/* View Mode Toggle: [Table] [Cards] */}
        <ViewToggle
          viewMode={directoryDisplayMode}
          onViewModeChange={onDisplayModeChange}
        />
      </div>
    </div>
  );
}
