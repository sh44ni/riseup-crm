import React from 'react';
import {
  DollarSign,
  Calculator,
  TrendingUp,
  Percent,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { UniversalCostInputs } from '@/types/estimateTypes';

interface EstimatePricingEngineProps {
  costInputs: UniversalCostInputs;
  onChangeCostInputs: (newInputs: UniversalCostInputs) => void;
  onApplyToOptionA?: (price: number) => void;
  onApplyToOptionB?: (price: number) => void;
}

export function EstimatePricingEngine({
  costInputs,
  onChangeCostInputs,
  onApplyToOptionA,
  onApplyToOptionB,
}: EstimatePricingEngineProps) {
  const {
    roofSquares,
    subcontractorLabor,
    roofingMaterials,
    disposalFees,
    permitFees,
    plywoodAllowance,
    otherCosts,
    salesCommission,
    commissionIsPct,
    selectedMarginPct,
  } = costInputs;

  // 1. Calculate True Job Cost
  // All intermediate calculations in integer CENTS to avoid float rounding
  const trueJobCostCents = Math.round(
    ((subcontractorLabor || 0) +
     (roofingMaterials || 0) +
     (disposalFees || 0) +
     (permitFees || 0) +
     (plywoodAllowance || 0) +
     (otherCosts || 0)) * 100
  );
  const trueJobCost = trueJobCostCents / 100; // dollars, for display only

  // 2. Margin tiers calculations: 15%, 20%, 25%, 30%, 35%, 50%
  const marginTiers = [15, 20, 25, 30, 35, 50];

  const calculateTierPrice = (marginPct: number) => {
    const m = marginPct / 100.0;
    const baseSellCents = m < 1.0
      ? Math.round(trueJobCostCents / (1.0 - m))
      : trueJobCostCents * 2;
    const commCents = commissionIsPct
      ? Math.round(baseSellCents * ((salesCommission || 0) / 100.0))
      : Math.round((salesCommission || 0) * 100);
    const finalPriceCents = baseSellCents + commCents;
    return {
      finalPrice: finalPriceCents / 100,
      profit: (finalPriceCents - trueJobCostCents) / 100,
      comm: commCents / 100,
    };
  };

  const activeCalc = calculateTierPrice(selectedMarginPct);
  const costPerSq = roofSquares > 0 ? Math.round(trueJobCostCents / roofSquares) / 100 : 0;
  const sellPerSq = roofSquares > 0 ? Math.round(activeCalc.finalPrice * 100 / roofSquares) / 100 : 0;

  const updateField = <K extends keyof UniversalCostInputs>(key: K, val: UniversalCostInputs[K]) => {
    onChangeCostInputs({
      ...costInputs,
      [key]: val,
    });
  };

  return (
    <div className="light-glass-panel rounded-3xl p-5 md:p-7 shadow-xs border border-white/85 dark:border-white/10 space-y-6">
      {/* Title & Live Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner">
            <Calculator size={20} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Universal Estimating Calculator &amp; Pricing Engine</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Enter job costs &rarr; system calculates True Cost and Company Margin tiers ($15\% - 50\%$)
            </p>
          </div>
        </div>

        {/* Live Job Cost Metric */}
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              True Job Cost
            </span>
            <span className="text-lg font-black tracking-tight text-white">
              ${trueJobCost.toLocaleString()}
            </span>
          </div>
          <div className="h-7 w-[1px] bg-slate-700 mx-1" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Cost / SQ
            </span>
            <span className="text-xs font-black text-slate-200">
              ${costPerSq}/sq ({roofSquares} SQ)
            </span>
          </div>
        </div>
      </div>

      {/* Cost Input Fields Grid */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>1. Direct Job Cost Inputs</span>
          <span className="text-[10px] font-bold text-slate-400 lowercase">(labor, materials, dump, permit)</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* Subcontractor Labor */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Subcontractor Labor
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={subcontractorLabor}
                onChange={(e) => updateField('subcontractorLabor', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Tear-off &amp; installation crew</span>
          </div>

          {/* Roofing Materials */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Roofing Materials
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={roofingMaterials}
                onChange={(e) => updateField('roofingMaterials', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Tile, underlayment, flashings</span>
          </div>

          {/* Dump / Disposal Fees */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Dump / Disposal Fees
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={disposalFees}
                onChange={(e) => updateField('disposalFees', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Dumpster drop &amp; landfill fees</span>
          </div>

          {/* City Permit */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              City Permit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={permitFees}
                onChange={(e) => updateField('permitFees', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">City inspection &amp; filing fees</span>
          </div>

          {/* Plywood Allowance */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Plywood Allowance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={plywoodAllowance}
                onChange={(e) => updateField('plywoodAllowance', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">3-4 sheets included contingency</span>
          </div>

          {/* Other Costs */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-slate-700 block">
              Other Costs
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={otherCosts}
                onChange={(e) => updateField('otherCosts', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Boom lift, fuel, logistics</span>
          </div>

          {/* Sales Commission */}
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-700">Sales Commission</label>
              <button
                type="button"
                onClick={() => updateField('commissionIsPct', !commissionIsPct)}
                className="text-[10px] font-black text-amber-700 hover:underline cursor-pointer"
              >
                {commissionIsPct ? 'Switch to $' : 'Switch to %'}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {commissionIsPct ? '%' : '$'}
              </span>
              <input
                type="number"
                value={salesCommission}
                onChange={(e) => updateField('salesCommission', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="10"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {commissionIsPct ? `~ $${activeCalc.comm} at ${selectedMarginPct}%` : 'Flat dollar commission'}
            </span>
          </div>

          {/* Roof Squares */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-2xs space-y-1.5 focus-within:border-amber-500 transition-all">
            <label className="text-[11px] font-extrabold text-amber-900 block">
              Roof Size (Squares)
            </label>
            <div className="relative">
              <input
                type="number"
                value={roofSquares}
                onChange={(e) => updateField('roofSquares', parseFloat(e.target.value) || 25)}
                className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                placeholder="25"
              />
            </div>
            <span className="text-[10px] text-amber-700 font-medium">100 sq ft per roof square</span>
          </div>
        </div>
      </div>

      {/* 2. Company Pricing Selections (15% - 50%) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>2. Company Pricing &amp; Margin Tiers</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              Click to select selling price
            </span>
          </h3>
          <span className="text-xs font-black text-slate-700">
            Selected: <span className="text-amber-600">{selectedMarginPct}% Margin</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {marginTiers.map((pct) => {
            const { finalPrice, profit } = calculateTierPrice(pct);
            const isSelected = selectedMarginPct === pct;

            return (
              <button
                key={pct}
                type="button"
                onClick={() => updateField('selectedMarginPct', pct)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer select-none relative group ${
                  isSelected
                    ? 'bg-gradient-to-b from-slate-900 to-slate-950 text-white border-slate-900 shadow-md scale-[1.02]'
                    : 'bg-white/90 hover:bg-white text-slate-900 border-slate-200/90 hover:border-amber-400 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[11px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pct}% Margin
                  </span>
                  {isSelected && <Check size={13} className="text-amber-400 stroke-[3]" />}
                </div>

                <div className="text-base font-black tracking-tight mt-1.5">
                  ${finalPrice.toLocaleString()}
                </div>

                <div
                  className={`text-[10px] font-bold mt-0.5 ${
                    isSelected ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  +${profit.toLocaleString()} Profit
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selling Price Spotlight & Quick-Apply Actions */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-amber-50/40 border border-sky-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">
            Selected Proposal Selling Price ({selectedMarginPct}% Company Margin)
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              ${activeCalc.finalPrice.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">
              (${sellPerSq}/SQ &bull; +${activeCalc.profit.toLocaleString()} Gross Profit)
            </span>
          </div>
        </div>

        {/* Quick Apply to Option A / B */}
        <div className="flex items-center gap-2 flex-wrap">
          {onApplyToOptionA && (
            <button
              type="button"
              onClick={() => onApplyToOptionA(activeCalc.finalPrice)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap size={13} className="text-amber-500" />
              <span>Apply to Option A</span>
            </button>
          )}

          {onApplyToOptionB && (
            <button
              type="button"
              onClick={() => onApplyToOptionB(activeCalc.finalPrice)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap size={13} className="text-amber-500" />
              <span>Apply to Option B</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
