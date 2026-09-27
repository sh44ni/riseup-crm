import React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';

export type CrmViewMode = 'table' | 'cards';

export interface ViewToggleProps {
  viewMode: CrmViewMode;
  onViewModeChange: (mode: CrmViewMode) => void;
  className?: string;
  tableLabel?: string;
  cardsLabel?: string;
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  className = '',
  tableLabel = 'Table',
  cardsLabel = 'Cards',
}: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode toggle"
      className={`flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        aria-pressed={viewMode === 'table'}
        title={`${tableLabel} View`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
          viewMode === 'table'
            ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
        }`}
      >
        <LayoutList
          size={13}
          className={viewMode === 'table' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}
        />
        <span>{tableLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => onViewModeChange('cards')}
        aria-pressed={viewMode === 'cards'}
        title={`${cardsLabel} View`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
          viewMode === 'cards'
            ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
        }`}
      >
        <LayoutGrid
          size={13}
          className={viewMode === 'cards' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}
        />
        <span>{cardsLabel}</span>
      </button>
    </div>
  );
}
