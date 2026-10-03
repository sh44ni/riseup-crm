import React from 'react';
import { Lock } from 'lucide-react';

interface LeadStageProgressionProps {
  currentStatus: string;
}

const STAGES = [
  { id: 'new_lead', label: '1. New' },
  { id: 'contacted', label: '2. Contacted' },
  { id: 'inspection_scheduled', label: '3. Inspection' },
  { id: 'proposal_sent', label: '4. Proposal' },
  { id: 'contract_won', label: '5. Won' },
];

export function LeadStageProgression({ currentStatus }: LeadStageProgressionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lock size={11} className="text-slate-400 dark:text-slate-500" />
          <span>Pipeline Stage Progression</span>
        </div>
        <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-white/10 border border-slate-300/60 dark:border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
          <Lock size={9} />
          <span>Auto-Synced with Pipeline (Read-Only)</span>
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
        {STAGES.map((step) => {
          const isCurrent = currentStatus === step.id;
          return (
            <div
              key={step.id}
              className={`py-1.5 px-1 text-center rounded-lg font-bold text-[10px] select-none transition-all cursor-default ${
                isCurrent
                  ? 'bg-[#1878B8] text-white shadow-xs font-black'
                  : 'text-slate-400 dark:text-slate-500 bg-transparent font-medium'
              }`}
              title={
                isCurrent
                  ? `Current Stage: ${step.label} (Synced from Pipeline)`
                  : `Stage: ${step.label} (Locked)`
              }
            >
              {step.label}
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[9.5px] text-slate-400 dark:text-slate-500 font-medium text-right italic">
        Stage progression is locked here • Update stages by moving leads in the Pipeline or Dashboard
      </div>
    </div>
  );
}
