import React from 'react';
import { Briefcase, Search } from 'lucide-react';
import { PipelineLeadItem, RealJobItem } from './types';

interface ScheduleEntityLinkingProps {
  entityType: 'none' | 'lead' | 'job';
  selectedEntityId: string;
  entitySearch: string;
  filteredEntities: (PipelineLeadItem | RealJobItem)[];
  onEntityTypeChange: (type: 'none' | 'lead' | 'job') => void;
  onEntitySearchChange: (search: string) => void;
  onSelectEntityId: (id: string) => void;
}

export function ScheduleEntityLinking({
  entityType,
  selectedEntityId,
  entitySearch,
  filteredEntities,
  onEntityTypeChange,
  onEntitySearchChange,
  onSelectEntityId,
}: ScheduleEntityLinkingProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Briefcase size={13} className="text-[#0284c7] dark:text-sky-400" />
          <span>Link to CRM Pipeline (Optional)</span>
        </label>

        <div className="flex items-center gap-1 bg-white dark:bg-white/10 p-0.5 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => onEntityTypeChange('none')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              entityType === 'none'
                ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            None
          </button>
          <button
            type="button"
            onClick={() => onEntityTypeChange('lead')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              entityType === 'lead'
                ? 'bg-[#0284c7] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Lead
          </button>
          <button
            type="button"
            onClick={() => onEntityTypeChange('job')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              entityType === 'job'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Job
          </button>
        </div>
      </div>

      {entityType !== 'none' && (
        <div className="space-y-2 pt-1">
          <div className="relative">
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => onEntitySearchChange(e.target.value)}
              placeholder={`Search ${
                entityType === 'lead'
                  ? 'leads by client name or city'
                  : 'jobs by customer or job #'
              }`}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs focus:outline-none focus:border-sky-500"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {filteredEntities.slice(0, 8).map((entity) => {
              const idStr = String(entity.id);
              const isSelected = selectedEntityId === idStr;
              const leadItem = entity as PipelineLeadItem;
              const jobItem = entity as RealJobItem;
              const displayName = leadItem.full_name || jobItem.customer_name || 'Client';
              const displaySub = leadItem.city
                ? `${leadItem.city} • ${leadItem.service_type || 'Roofing'}`
                : jobItem.job_number || '';

              return (
                <button
                  key={idStr}
                  type="button"
                  onClick={() => onSelectEntityId(idStr)}
                  className={`w-full text-left p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 border-sky-300 dark:border-sky-700'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{displayName}</span>
                  <span className="text-[10.5px] font-normal text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                    {displaySub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
