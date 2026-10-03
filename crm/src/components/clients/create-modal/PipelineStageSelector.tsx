import React from 'react';
import { Layers, BadgeCheck } from 'lucide-react';
import { PIPELINE_STAGE_OPTIONS } from './types';

interface PipelineStageSelectorProps {
  value: string;
  onChange: (stageId: string) => void;
}

export function PipelineStageSelector({ value, onChange }: PipelineStageSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
        <Layers size={14} className="text-emerald-500" />
        <span>Target Pipeline Stage</span>
        <span className="text-rose-500">*</span>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PIPELINE_STAGE_OPTIONS.map((opt) => {
          const IconComponent = opt.icon;
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`h-11 px-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/25'
                  : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <IconComponent size={14} />
                </div>
                <span className="text-xs font-bold truncate">
                  {opt.label}
                </span>
              </div>
              {isSelected && (
                <BadgeCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
