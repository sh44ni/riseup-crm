import React, { useState } from 'react';
import { TwoOptionsEstimate, EstimatePlan } from '@/types/estimateContractTypes';
import { ESTIMATE_FIELD_CAPS } from '@/shared/config/estimateConstants';
import { FieldWithCap } from '../FieldWithCap';
import { ScopeItemEditor } from '../ScopeItemEditor';

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

export function PlansStep({ data, onDataChange }: StepProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  const planIndex = activeTab === 'A' ? 0 : 1;
  const currentPlan = data.plans[planIndex];

  const handleUpdate = (updates: Partial<EstimatePlan>) => {
    const newPlans = [...data.plans] as [EstimatePlan, EstimatePlan];
    newPlans[planIndex] = { ...currentPlan, ...updates };
    onDataChange({ plans: newPlans });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(rawVal, 10);
    if (!isNaN(num)) {
      handleUpdate({ price: num });
    } else {
      handleUpdate({ price: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('A')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'A' ? 'bg-white text-[#1a5ba5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Plan A (Option 1)
        </button>
        <button
          onClick={() => setActiveTab('B')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'B' ? 'bg-white text-[#1a5ba5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Plan B (Option 2)
        </button>
      </div>

      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200" key={activeTab}>
        <div className="grid grid-cols-2 gap-4">
          <FieldWithCap
            label="Plan Name"
            value={currentPlan.name}
            onChange={(val) => handleUpdate({ name: val })}
            maxLength={ESTIMATE_FIELD_CAPS.planName}
            placeholder="e.g. TILE ROOF LIFT & RELAY"
          />
          <FieldWithCap
            label="Subtitle"
            value={currentPlan.subtitle}
            onChange={(val) => handleUpdate({ subtitle: val })}
            maxLength={ESTIMATE_FIELD_CAPS.planSubtitle}
            placeholder="e.g. REUSE EXISTING TILES"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldWithCap
            label="Price Badge Label"
            value={currentPlan.priceBadgeLabel}
            onChange={(val) => handleUpdate({ priceBadgeLabel: val })}
            maxLength={ESTIMATE_FIELD_CAPS.priceBadgeLabel}
            placeholder="e.g. INCLUDED UNDERLAYMENT"
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
              Lock-In Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
              <input
                type="text"
                value={currentPlan.price === 0 ? '' : currentPlan.price.toLocaleString('en-US')}
                onChange={handlePriceChange}
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all shadow-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <ScopeItemEditor
            items={currentPlan.scopeItems}
            onChange={(items) => handleUpdate({ scopeItems: items })}
            minItems={ESTIMATE_FIELD_CAPS.scopeItemsMin}
            maxItems={ESTIMATE_FIELD_CAPS.scopeItemsMax}
            maxChars={ESTIMATE_FIELD_CAPS.scopeItemText}
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Warranty Chips</h4>
          <div className="grid grid-cols-2 gap-4">
            <FieldWithCap
              label="Warranty Line 1"
              value={currentPlan.warrantyChips[0]}
              onChange={(val) => handleUpdate({ warrantyChips: [val, currentPlan.warrantyChips[1]] })}
              maxLength={ESTIMATE_FIELD_CAPS.warrantyChip}
              placeholder="e.g. 10 YEAR WORKMANSHIP"
            />
            <FieldWithCap
              label="Warranty Line 2"
              value={currentPlan.warrantyChips[1]}
              onChange={(val) => handleUpdate({ warrantyChips: [currentPlan.warrantyChips[0], val] })}
              maxLength={ESTIMATE_FIELD_CAPS.warrantyChip}
              placeholder="e.g. 30 YEAR MANUFACTURER"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
