import React from 'react';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
import { ESTIMATE_FIELD_CAPS } from '@/shared/config/estimateConstants';
import { FieldWithCap } from '../FieldWithCap';

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

export function SpecialPricingStep({ data, onDataChange }: StepProps) {
  const { pricing, plans } = data;

  const handleUpdate = (updates: Partial<typeof pricing>) => {
    onDataChange({ pricing: { ...pricing, ...updates } });
  };

  const handleLockInDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 1;
    handleUpdate({ lockInDays: val });
  };

  const handleStandardPriceChange = (index: 0 | 1, valStr: string) => {
    const rawVal = valStr.replace(/[^0-9]/g, '');
    const num = parseInt(rawVal, 10) || 0;
    const newPrices = [...pricing.standardPrices] as [number, number];
    newPrices[index] = num;
    handleUpdate({ standardPrices: newPrices });
  };

  const renderedNote = pricing.importantNote.replace(/\{N\}/g, pricing.lockInDays.toString());

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div className="w-1/2 mb-6">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
            Lock-In Window (Days)
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={pricing.lockInDays}
            onChange={handleLockInDaysChange}
            className="w-full px-4 py-2.5 mt-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#1a5ba5] focus:outline-none focus:ring-2 focus:ring-[#1a5ba5]/20 focus:border-[#1a5ba5]"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1 truncate block">
              Standard Price &mdash; {plans[0].name || 'Plan A'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
              <input
                type="text"
                value={pricing.standardPrices[0] === 0 ? '' : pricing.standardPrices[0].toLocaleString('en-US')}
                onChange={(e) => handleStandardPriceChange(0, e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a5ba5]/20 focus:border-[#1a5ba5]"
              />
            </div>
            <div className="text-[10px] font-bold text-amber-600 pl-1">
              Lock-in price: ${plans[0].price.toLocaleString('en-US')}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1 truncate block">
              Standard Price &mdash; {plans[1].name || 'Plan B'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
              <input
                type="text"
                value={pricing.standardPrices[1] === 0 ? '' : pricing.standardPrices[1].toLocaleString('en-US')}
                onChange={(e) => handleStandardPriceChange(1, e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a5ba5]/20 focus:border-[#1a5ba5]"
              />
            </div>
            <div className="text-[10px] font-bold text-amber-600 pl-1">
              Lock-in price: ${plans[1].price.toLocaleString('en-US')}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <FieldWithCap
          label="Important Note Text"
          value={pricing.importantNote}
          onChange={(val) => handleUpdate({ importantNote: val })}
          maxLength={ESTIMATE_FIELD_CAPS.importantNote}
          multiline
          rows={3}
        />
        
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
          <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
            Live Preview
          </label>
          <p className="text-sm text-slate-700 font-medium italic">
            "{renderedNote}"
          </p>
        </div>
      </div>
    </div>
  );
}
