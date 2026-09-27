import React from 'react';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
import { TEMPLATE_REGISTRY } from '@/data/estimateConstants';

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

export function TemplateStep({ data, onDataChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800">Choose Estimate Template</h2>
        <p className="text-sm text-slate-500 mt-1">Select the format that best fits this proposal.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TEMPLATE_REGISTRY.map((template) => {
          const isActive = template.id === 'two-options';
          const isSelected = data.templateId === template.id;

          return (
            <div
              key={template.id}
              onClick={() => isActive && onDataChange({ templateId: 'two-options' as const })}
              className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#1a5ba5] bg-blue-50/50 shadow-md'
                  : isActive
                  ? 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
                  : 'border-slate-200 bg-slate-50 grayscale opacity-60 cursor-not-allowed'
              }`}
            >
              {!isActive && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Coming Soon
                </div>
              )}

              <h3 className={`text-sm font-bold ${isSelected ? 'text-[#1a5ba5]' : 'text-slate-800'}`}>
                {template.label}
              </h3>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5 mb-3 uppercase tracking-wide">
                {template.pageCount} {template.pageCount === 1 ? 'Page' : 'Pages'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {template.description}
              </p>

              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#1a5ba5] text-white rounded-full flex items-center justify-center shadow-sm">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
