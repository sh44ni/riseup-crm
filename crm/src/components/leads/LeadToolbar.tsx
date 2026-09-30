import React, { useRef, useEffect } from 'react';
import { Users, AlertTriangle, ChevronDown, Check, Search } from 'lucide-react';
import { ViewToggle } from '@/components/common/ViewToggle';
import { Lead } from '@/types/leadTypes';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';

interface LeadToolbarProps {
  leads: Lead[];
  totalLeads: number;
  lostLeads: Lead[];
  activeStage: string;
  setActiveStage: (stage: string) => void;
  openDropdown: 'source' | 'rep' | 'service' | 'loss' | 'sort' | null;
  setOpenDropdown: (val: 'source' | 'rep' | 'service' | 'loss' | 'sort' | null) => void;
  selectedSource: string;
  setSelectedSource: (val: string) => void;
  sources: string[];
  selectedRep: string;
  setSelectedRep: (val: string) => void;
  repOptions: string[];
  selectedService: string;
  setSelectedService: (val: string) => void;
  serviceOptions: string[];
  selectedLossReason: string;
  setSelectedLossReason: (val: string) => void;
  search: string;
  setSearch: (val: string) => void;
  filteredLeadsLength: number;
  sortBy: 'newest' | 'value' | 'speed';
  setSortBy: (val: 'newest' | 'value' | 'speed') => void;
  viewMode: 'table' | 'cards';
  setViewMode: (val: 'table' | 'cards') => void;
}

export function LeadToolbar({
  leads,
  totalLeads,
  lostLeads,
  activeStage,
  setActiveStage,
  openDropdown,
  setOpenDropdown,
  selectedSource,
  setSelectedSource,
  sources,
  selectedRep,
  setSelectedRep,
  repOptions,
  selectedService,
  setSelectedService,
  serviceOptions,
  selectedLossReason,
  setSelectedLossReason,
  search,
  setSearch,
  filteredLeadsLength,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}: LeadToolbarProps) {
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Outside click for filter dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpenDropdown]);

  // Keyboard shortcut for escape is handled in LeadsPage

  return (
    <div ref={filterBarRef} className="space-y-2">
      {/* ── Unified Tab Bar ── */}
      <div className="light-glass-card rounded-2xl border border-white/85 dark:border-white/10 dark:bg-slate-900/60 shadow-2xs backdrop-blur-2xl overflow-hidden">
        <div className="flex items-stretch overflow-x-auto no-scrollbar">
          {/* All Inquiries */}
          {([
            { id: 'all', label: 'All Inquiries', count: totalLeads, icon: <Users size={12} />, activeClass: 'bg-[#1878B8] text-white' },
            { id: 'new_lead', label: 'New Leads', count: leads.filter((l) => l.status === 'new_lead').length, icon: <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />, activeClass: 'bg-sky-600 text-white' },
            { id: 'contacted', label: 'Contacted', count: leads.filter((l) => l.status === 'contacted').length, icon: <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />, activeClass: 'bg-blue-600 text-white' },
            { id: 'inspection_scheduled', label: 'Inspection', count: leads.filter((l) => l.status === 'inspection_scheduled').length, icon: <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />, activeClass: 'bg-purple-600 text-white' },
            { id: 'proposal_sent', label: 'Proposal Sent', count: leads.filter((l) => l.status === 'proposal_sent').length, icon: <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />, activeClass: 'bg-amber-600 text-white' },
            { id: 'contract_won', label: 'Contract Won', count: leads.filter((l) => l.status === 'contract_won').length, icon: <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />, activeClass: 'bg-emerald-600 text-white' },
          ] as const).map((tab, i, arr) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStage(tab.id as string)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                i < arr.length - 1 ? 'border-r border-slate-200/60 dark:border-white/10' : ''
              } ${
                activeStage === tab.id
                  ? `${tab.activeClass} shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ml-0.5 ${
                  activeStage === tab.id
                    ? 'bg-black/20 text-white'
                    : 'bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
              {activeStage === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/40 rounded-full" />
              )}
            </button>
          ))}

          {/* Divider before Lost */}
          <div className="w-px bg-slate-200/60 dark:bg-white/10 self-stretch mx-1" />

          {/* Lost Leads — dedicated rose tab */}
          <button
            type="button"
            onClick={() => setActiveStage('lost')}
            className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeStage === 'lost'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:text-rose-900 dark:hover:text-rose-300'
            }`}
          >
            <AlertTriangle size={11} className={activeStage === 'lost' ? 'text-white' : 'text-rose-500'} />
            <span>Lost Leads</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ml-0.5 ${
                activeStage === 'lost'
                  ? 'bg-black/20 text-white'
                  : 'bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 text-rose-700'
              }`}
            >
              {lostLeads.length}
            </span>
            {activeStage === 'lost' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/40 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Filters & Controls Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Source Filter */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'source'}
              aria-haspopup="true"
              onClick={() => setOpenDropdown(openDropdown === 'source' ? null : 'source')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl light-glass-card dark:bg-[#0B1320]/80 hover:border-sky-400 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs border border-white/85 dark:border-white/10 transition-all cursor-pointer"
            >
              <span className="text-slate-400 font-normal">Source:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {selectedSource === 'all'
                  ? 'All Sources'
                  : selectedSource === 'website'
                  ? 'Website'
                  : selectedSource === 'manual'
                  ? 'Manual Entries'
                  : selectedSource}
              </span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${openDropdown === 'source' ? 'rotate-180 text-sky-600' : ''}`} />
            </button>
            {openDropdown === 'source' && (
              <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-xl p-1.5 space-y-0.5">
                {[
                  { id: 'all', label: 'All Sources' },
                  ...sources.map((s) => ({ id: s, label: s })),
                ].map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => {
                      setSelectedSource(src.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      selectedSource === src.id ? 'bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{src.label}</span>
                    {selectedSource === src.id && <Check size={12} className="text-[#1878B8]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Rep Filter */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'rep'}
              aria-haspopup="true"
              onClick={() => setOpenDropdown(openDropdown === 'rep' ? null : 'rep')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl light-glass-card dark:bg-[#0B1320]/80 hover:border-sky-400 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs border border-white/85 dark:border-white/10 transition-all cursor-pointer"
            >
              <span className="text-slate-400 font-normal">Rep:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{selectedRep === 'all' ? 'All Reps' : selectedRep}</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${openDropdown === 'rep' ? 'rotate-180 text-sky-600' : ''}`} />
            </button>
            {openDropdown === 'rep' && (
              <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-xl p-1.5 space-y-0.5">
                {repOptions.map((rep) => (
                  <button
                    key={rep}
                    type="button"
                    onClick={() => {
                      setSelectedRep(rep);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      selectedRep === rep ? 'bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{rep === 'all' ? 'All Reps' : rep}</span>
                    {selectedRep === rep && <Check size={12} className="text-[#1878B8]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Service Filter */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'service'}
              aria-haspopup="true"
              onClick={() => setOpenDropdown(openDropdown === 'service' ? null : 'service')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl light-glass-card dark:bg-[#0B1320]/80 hover:border-sky-400 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs border border-white/85 dark:border-white/10 transition-all cursor-pointer"
            >
              <span className="text-slate-400 font-normal">Service:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{selectedService === 'all' ? 'All Services' : selectedService}</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${openDropdown === 'service' ? 'rotate-180 text-sky-600' : ''}`} />
            </button>
            {openDropdown === 'service' && (
              <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-xl p-1.5 space-y-0.5">
                {serviceOptions.map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => {
                      setSelectedService(srv);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      selectedService === srv ? 'bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{srv === 'all' ? 'All Services' : srv}</span>
                    {selectedService === srv && <Check size={12} className="text-[#1878B8]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Loss Reason Filter (Shown on Lost tab or if lost leads exist) */}
          {(activeStage === 'lost' || activeStage === 'all') && (
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'loss'}
                aria-haspopup="true"
                onClick={() => setOpenDropdown(openDropdown === 'loss' ? null : 'loss')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl light-glass-card hover:border-rose-400 text-rose-800 dark:text-rose-300 font-semibold shadow-2xs border border-rose-200/80 dark:border-rose-900/60 transition-all cursor-pointer bg-rose-50/50 dark:bg-rose-950/40"
              >
                <span className="text-rose-500 font-normal">Loss Reason:</span>
                <span className="font-bold">
                  {selectedLossReason === 'all'
                    ? 'All Reasons'
                    : LOSS_REASONS[selectedLossReason]?.label || selectedLossReason}
                </span>
                <ChevronDown size={12} className={`text-rose-400 transition-transform ${openDropdown === 'loss' ? 'rotate-180 text-rose-600' : ''}`} />
              </button>
              {openDropdown === 'loss' && (
                <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-xl p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLossReason('all');
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      selectedLossReason === 'all' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>All Loss Reasons</span>
                    {selectedLossReason === 'all' && <Check size={12} className="text-rose-600" />}
                  </button>
                  {Object.entries(LOSS_REASONS).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedLossReason(key);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        selectedLossReason === key ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {selectedLossReason === key && <Check size={12} className="text-rose-600 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset Filters */}
          {(selectedSource !== 'all' || selectedRep !== 'all' || selectedService !== 'all' || selectedLossReason !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSource('all');
                setSelectedRep('all');
                setSelectedService('all');
                setSelectedLossReason('all');
                setSearch('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 underline px-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium text-[11px]">
            Showing <strong className="text-slate-800 dark:text-slate-100">{filteredLeadsLength}</strong> of {leads.length}
          </span>
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'sort'}
              aria-haspopup="true"
              onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#0B1320]/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <span className="text-slate-400">Sort:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {sortBy === 'newest'
                  ? 'Newest First'
                  : sortBy === 'value'
                  ? 'Deal Value ($)'
                  : 'Speed to Call'}
              </span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {openDropdown === 'sort' && (
              <div className="absolute top-full right-0 mt-1 z-50 w-44 rounded-xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl border border-white/90 dark:border-white/10 shadow-xl p-1.5 space-y-0.5">
                {[
                  { id: 'newest', label: 'Newest First' },
                  { id: 'value', label: 'Deal Value ($ High)' },
                  { id: 'speed', label: 'Speed to Call' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSortBy(s.id as any);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      sortBy === s.id ? 'bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{s.label}</span>
                    {sortBy === s.id && <Check size={12} className="text-[#1878B8]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle: [Table] [Cards] */}
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            className="ml-1"
          />
        </div>
      </div>
    </div>
  );
}
