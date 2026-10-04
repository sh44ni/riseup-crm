import React from 'react';
import { RefreshCw, Download, Plus, Search, X, Filter, Kanban, Layers, Clock, Calendar } from 'lucide-react';
import { PipelineSummary } from '@/api/pipelineApi';

interface PipelineToolbarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExportCSV: () => void;
  canCreateLead: boolean;
  onCreateLead: () => void;
  isOwnOnly: boolean;
  summary: PipelineSummary | null;
  dealsCount: number;
  
  viewMode: 'kanban' | 'timeline' | 'table' | 'calendar';
  onViewModeChange: (m: 'kanban' | 'timeline' | 'table' | 'calendar') => void;
  filteredDealsCount: number;
  
  selectedEstimator: string;
  onEstimatorChange: (v: string) => void;
  availableEstimators: string[];
  
  selectedService: string;
  onServiceChange: (v: string) => void;
  
  selectedSlaFilter: string;
  onSlaFilterChange: (v: string) => void;
}

export function PipelineToolbar({
  searchQuery, onSearchChange, searchInputRef, isRefreshing, onRefresh, onExportCSV, canCreateLead, onCreateLead,
  isOwnOnly,
  viewMode, onViewModeChange, filteredDealsCount,
  selectedEstimator, onEstimatorChange, availableEstimators,
  selectedService, onServiceChange,
  selectedSlaFilter, onSlaFilterChange,
}: PipelineToolbarProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative w-full max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1878B8] dark:text-sky-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search pipeline deals, clients, addresses, estimators..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/90 dark:bg-[#0B1320]/85 border border-slate-200/90 dark:border-white/12 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1878B8] shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOwnOnly && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/90 dark:border-indigo-800/60 text-[10px] font-bold text-indigo-800 dark:text-indigo-300 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>My Pipeline Only</span>
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
            title="Refresh pipeline from database"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#1878B8]' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={onExportCSV}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          {canCreateLead && (
            <button
              type="button"
              onClick={onCreateLead}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>New Deal</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="w-full p-1.5 rounded-2xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            <button
              type="button"
              onClick={() => onViewModeChange('kanban')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#0284c7] text-white shadow-md shadow-sky-500/20 ring-1 ring-white/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Kanban size={15} className={viewMode === 'kanban' ? 'text-white' : 'text-[#1878B8] dark:text-sky-400'} />
              <span>8-Step Board</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${viewMode === 'kanban' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {filteredDealsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#0284c7] text-white shadow-md shadow-sky-500/20 ring-1 ring-white/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Layers size={15} className={viewMode === 'table' ? 'text-white' : 'text-[#1878B8] dark:text-sky-400'} />
              <span>Deals Table</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${viewMode === 'table' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {filteredDealsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('timeline')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#0284c7] text-white shadow-md shadow-sky-500/20 ring-1 ring-white/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Clock size={15} className={viewMode === 'timeline' ? 'text-white' : 'text-[#1878B8] dark:text-sky-400'} />
              <span>Process Timeline</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${viewMode === 'timeline' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                SLA
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('calendar')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#0284c7] text-white shadow-md shadow-sky-500/20 ring-1 ring-white/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Calendar size={15} className={viewMode === 'calendar' ? 'text-white' : 'text-[#1878B8] dark:text-sky-400'} />
              <span>Calendar Visits</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${viewMode === 'calendar' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                Schedule
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Filter size={12} className="text-[#1878B8] dark:text-sky-400" />
              <span>Filter:</span>
            </div>

            <select
              value={selectedEstimator}
              onChange={(e) => onEstimatorChange(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none shadow-2xs"
            >
              <option value="all">All Estimators</option>
              {availableEstimators.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>

            <select
              value={selectedService}
              onChange={(e) => onServiceChange(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none shadow-2xs"
            >
              <option value="all">All Roofing Types</option>
              <option value="Tile">Spanish / Concrete Tile</option>
              <option value="Shingle">Architectural Shingle</option>
              <option value="Metal">Standing Seam Metal</option>
              <option value="Commercial">Flat / Commercial TPO</option>
              <option value="Repair">Leak Repair &amp; Maintenance</option>
            </select>

            <select
              value={selectedSlaFilter}
              onChange={(e) => onSlaFilterChange(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none shadow-2xs"
            >
              <option value="all">All SLA Timelines</option>
              <option value="due_today">⚡ Action Due Today</option>
              <option value="overdue">⚠️ SLA Overdue</option>
              <option value="high_value">💎 High Value (&gt;$25k)</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
