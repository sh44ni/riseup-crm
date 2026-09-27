import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  CalendarDays,
  ChevronDown,
  Search,
  Plus,
  Check,
} from 'lucide-react';

export interface DashboardToolbarProps {
  statsLoading: boolean;
  totalDeals: number;
  viewMode: 'kanban' | 'list' | 'calendar';
  onViewModeChange: (mode: 'kanban' | 'list' | 'calendar') => void;
  selectedSource: string;
  onSelectSource: (source: string) => void;
  selectedRep: string;
  onSelectRep: (rep: string) => void;
  selectedService: string;
  onSelectService: (service: string) => void;
  pipelineSearch: string;
  onSearchChange: (q: string) => void;
  canCreateLead: boolean;
  onCreateLead: () => void;
  repOptions: string[];
  sourceOptions?: string[];
  serviceOptions?: string[];
}

const DEFAULT_SOURCES = ['All Sources', 'Website', 'Manual'];
const DEFAULT_SERVICES = [
  'All Services',
  'Residential Roofing',
  'Shingle Roof',
  'Tile Roofing',
  'Roof Repair',
  'Commercial Flat',
  'Maintenance',
  'Torch Down',
];

export function DashboardToolbar({
  statsLoading,
  totalDeals,
  viewMode,
  onViewModeChange,
  selectedSource,
  onSelectSource,
  selectedRep,
  onSelectRep,
  selectedService,
  onSelectService,
  pipelineSearch,
  onSearchChange,
  canCreateLead,
  onCreateLead,
  repOptions,
  sourceOptions = DEFAULT_SOURCES,
  serviceOptions = DEFAULT_SERVICES,
}: DashboardToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<'source' | 'rep' | 'service' | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap shrink-0 mb-2">
      {/* Title & View Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-[#1F1F1F] dark:text-white tracking-tight">
            Sales Pipeline
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100/90 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-300/70 dark:border-sky-800/60 shadow-2xs backdrop-blur-xs">
            {statsLoading ? (
              <span className="inline-block w-8 h-3 bg-sky-200/60 animate-pulse rounded" />
            ) : (
              `${totalDeals} Deals`
            )}
          </span>
        </div>

        {/* View Mode Segmented Control: Kanban is default active */}
        <div className="flex items-center p-0.5 rounded-xl bg-white/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-2xs">
          <button
            type="button"
            onClick={() => onViewModeChange('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid size={12} />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <List size={12} />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <CalendarDays size={12} />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {/* Filters & Search & Single Primary Action Button */}
      <div ref={filterDropdownRef} className="flex items-center gap-2">
        {/* Filter 1: Sources */}
        <div className="relative">
          <button
            type="button"
            aria-label="Filter by lead source"
            aria-expanded={activeDropdown === 'source'}
            onClick={() => setActiveDropdown(activeDropdown === 'source' ? null : 'source')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
              selectedSource !== 'All Sources'
                ? 'bg-sky-50/90 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/60 font-bold shadow-xs'
                : 'liquid-glass-btn text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="truncate max-w-[84px]">{selectedSource}</span>
            <ChevronDown
              size={11}
              className={`opacity-60 transition-transform duration-150 ${
                activeDropdown === 'source' ? 'rotate-180 text-[#0284c7]' : ''
              }`}
            />
          </button>

          {activeDropdown === 'source' && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-[0_12px_32px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {sourceOptions.map((opt) => {
                const isSelected = selectedSource === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onSelectSource(opt);
                      setActiveDropdown(null);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={11} className="text-[#0284c7] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter 2: Reps */}
        <div className="relative">
          <button
            type="button"
            aria-label="Filter by sales representative"
            aria-expanded={activeDropdown === 'rep'}
            onClick={() => setActiveDropdown(activeDropdown === 'rep' ? null : 'rep')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
              selectedRep !== 'All Reps'
                ? 'bg-sky-50/90 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/60 font-bold shadow-xs'
                : 'liquid-glass-btn text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="truncate max-w-[84px]">{selectedRep.split(' ')[0]}</span>
            <ChevronDown
              size={11}
              className={`opacity-60 transition-transform duration-150 ${
                activeDropdown === 'rep' ? 'rotate-180 text-[#0284c7]' : ''
              }`}
            />
          </button>

          {activeDropdown === 'rep' && (
            <div className="absolute top-full left-0 mt-1 w-48 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-[0_12px_32px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {repOptions.map((opt) => {
                const isSelected = selectedRep === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onSelectRep(opt);
                      setActiveDropdown(null);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={11} className="text-[#0284c7] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter 3: Services */}
        <div className="relative">
          <button
            type="button"
            aria-label="Filter by roofing service"
            aria-expanded={activeDropdown === 'service'}
            onClick={() => setActiveDropdown(activeDropdown === 'service' ? null : 'service')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
              selectedService !== 'All Services'
                ? 'bg-sky-50/90 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/60 font-bold shadow-xs'
                : 'liquid-glass-btn text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="truncate max-w-[84px]">{selectedService}</span>
            <ChevronDown
              size={11}
              className={`opacity-60 transition-transform duration-150 ${
                activeDropdown === 'service' ? 'rotate-180 text-[#0284c7]' : ''
              }`}
            />
          </button>

          {activeDropdown === 'service' && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-[0_12px_32px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {serviceOptions.map((opt) => {
                const isSelected = selectedService === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onSelectService(opt);
                      setActiveDropdown(null);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={11} className="text-[#0284c7] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Pipeline */}
        <div className="relative w-36">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search pipeline..."
            value={pipelineSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 rounded-lg liquid-glass-input text-[11px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
          />
        </div>

        {/* Single "+ New Lead" Primary CTA Button */}
        {canCreateLead && (
          <button
            type="button"
            onClick={onCreateLead}
            className="flex items-center gap-1 px-3.5 py-1 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-[11px] font-bold shadow-[0_2px_10px_rgba(24,120,184,0.3)] hover:shadow-[0_4px_16px_rgba(24,120,184,0.4)] border border-sky-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={13} className="stroke-[2.5]" />
            <span>New Lead</span>
          </button>
        )}
      </div>
    </div>
  );
}
