import React from 'react';
import { User, Phone, MapPin, Mail, Search, X, Lock } from 'lucide-react';
import { Lead, SelectedLead, STAGE_PRIORITY, stageLabel, stageBadgeClass } from './types';

interface UploadLeadSelectorProps {
  selectedLead: SelectedLead | null;
  email: string;
  searchQuery: string;
  leads: Lead[];
  isSearching: boolean;
  showDropdown: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onSearchQueryChange: (q: string) => void;
  onShowDropdownChange: (show: boolean) => void;
  onSelectLead: (lead: Lead) => void;
  onClearLead: () => void;
  onEmailChange: (email: string) => void;
}

export function UploadLeadSelector({
  selectedLead,
  email,
  searchQuery,
  leads,
  isSearching,
  showDropdown,
  dropdownRef,
  onSearchQueryChange,
  onShowDropdownChange,
  onSelectLead,
  onClearLead,
  onEmailChange,
}: UploadLeadSelectorProps) {
  return (
    <div>
      <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-[#1878B8] text-white text-[9px] font-black flex items-center justify-center">
          1
        </span>
        Select Lead <span className="text-rose-500">*</span>
      </div>

      {selectedLead ? (
        <div className="p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <User size={14} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {selectedLead.name}
                </div>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${stageBadgeClass(
                    selectedLead.stage
                  )}`}
                >
                  {stageLabel(selectedLead.stage)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearLead}
              className="w-7 h-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all cursor-pointer"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                Phone <Lock size={9} />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
                <Phone size={11} className="text-slate-400 shrink-0" />
                {selectedLead.phone || '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                Property <Lock size={9} />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg truncate">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{selectedLead.property || '—'}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Email Address <span className="text-rose-500">*</span>
            </div>
            <div className="relative">
              <Mail
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Client email address"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search leads by name, phone, address…"
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                onShowDropdownChange(true);
              }}
              onFocus={() => onShowDropdownChange(true)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {showDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#0B1320] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
              {isSearching ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                  Searching…
                </div>
              ) : leads.length > 0 ? (
                leads.map((lead) => {
                  const name = lead.full_name || lead.name || '';
                  const stage = lead.pipeline_stage || '';
                  const isScheduled = STAGE_PRIORITY[stage] === 1;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border font-black uppercase tracking-wider shrink-0 ${stageBadgeClass(
                            stage
                          )}`}
                        >
                          {stageLabel(stage)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={10} /> {lead.phone}
                          </span>
                        )}
                        {lead.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={10} /> {lead.address}
                          </span>
                        )}
                      </div>
                      {isScheduled && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          ✓ Ready for estimate
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No leads found for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Try searching by name, phone, or address.
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
            Leads in <strong>Estimate Scheduled</strong> are shown first. All non-lost leads are
            searchable.
          </p>
        </div>
      )}
    </div>
  );
}
