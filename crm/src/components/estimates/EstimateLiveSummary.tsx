import React from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  FileDown,
  Send,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { HomeownerSpecs, MaterialSelection, ScopeItem } from '@/types/estimateTypes';

interface EstimateLiveSummaryProps {
  specs: HomeownerSpecs;
  material: MaterialSelection;
  scope: ScopeItem[];
  onDeliver?: () => void;
  onGeneratePdf?: () => void;
}

export function EstimateLiveSummary({
  specs,
  material,
  scope,
  onDeliver,
  onGeneratePdf,
}: EstimateLiveSummaryProps) {
  // Real-time calculations
  const tearOffTotal = specs.squares * specs.tearOffCostPerSq;
  const difficultyMultiplier = specs.pitchMultiplier * specs.storyMultiplier;
  const rawMaterialAndLabor = specs.squares * material.costPerSq * difficultyMultiplier;
  const underlaymentTotal = specs.squares * material.underlaymentCostPerSq;

  const addOnsTotal = scope
    .filter((i) => i.selected && !i.includedInBase)
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const estimatedTotal = Math.round(
    rawMaterialAndLabor + tearOffTotal + underlaymentTotal + addOnsTotal
  );

  const monthlyFinancing = Math.round((estimatedTotal / 1000) * 12.8);
  const estimatedCost = Math.round(estimatedTotal * 0.61);
  const grossProfit = estimatedTotal - estimatedCost;
  const marginPct = Math.round((grossProfit / (estimatedTotal || 1)) * 100);

  return (
    <div className="light-glass-panel rounded-3xl p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-white/85 dark:border-white/10 space-y-4 sticky top-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-black text-sm text-slate-900 tracking-tight">
            Live Estimate Cockpit
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
          Real-Time
        </span>
      </div>

      {/* Target Homeowner */}
      <div className="liquid-glass-tile rounded-xl p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 truncate">
            {specs.customerName || 'Homeowner on File'}
          </span>
          <span className="text-[11px] font-black text-amber-700">
            {specs.squares} SQ
          </span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
          <MapPin size={11} className="text-[#0284C7] shrink-0" />
          <span className="truncate">
            {specs.streetAddress || 'Address on file'}, {specs.city}
          </span>
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="divide-y divide-slate-100 text-xs space-y-2 pt-1">
        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Specified Material:</span>
          <span className="font-bold text-slate-900 text-right truncate max-w-[170px]" title={material.materialName}>
            {material.materialName}
          </span>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Surface Dimensions:</span>
          <span className="font-bold text-slate-900">
            {specs.squares} SQ ({(specs.squares * 100).toLocaleString()} sq ft)
          </span>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Slope / Pitch Multiplier:</span>
          <span className="font-bold text-slate-900">
            {specs.pitch.split(' ')[0]} ({specs.pitchMultiplier === 1 ? 'Base' : `+${Math.round((specs.pitchMultiplier - 1) * 100)}%`})
          </span>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Tear-Off ({specs.tearOff.replace('_', ' ')}):</span>
          <span className="font-bold text-slate-900">${tearOffTotal.toLocaleString()}</span>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Underlayment Barrier:</span>
          <span className="font-bold text-slate-900">${underlaymentTotal.toLocaleString()}</span>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">
            Active Add-Ons ({scope.filter((i) => i.selected && !i.includedInBase).length}):
          </span>
          <span className="font-bold text-slate-900">${addOnsTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Big Total Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0B1E33] text-white shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
          <span>Quoted Total (Gold Tier):</span>
          <span className="text-[10px] font-bold text-amber-300 uppercase">Recommended</span>
        </div>

        <div className="text-2xl md:text-3xl font-black tracking-tight text-white">
          ${estimatedTotal.toLocaleString()}
        </div>

        <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
          <span className="text-slate-300">Est. Financing:</span>
          <span className="font-black text-emerald-400">${monthlyFinancing} / mo</span>
        </div>
      </div>

      {/* Estimator Profitability */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Gross Margin</span>
          <div className="font-black text-emerald-600 text-sm mt-0.5">{marginPct}%</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Gross Profit</span>
          <div className="font-black text-slate-900 text-sm mt-0.5">${grossProfit.toLocaleString()}</div>
        </div>
      </div>

      {/* Quick Action CTAs */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={onDeliver}
          className="w-full py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Send size={13} />
          <span>Deliver Proposal via SMS/Email</span>
        </button>

        <button
          type="button"
          onClick={onGeneratePdf}
          className="w-full py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <FileDown size={13} className="text-slate-500" />
          <span>Download Formal PDF</span>
        </button>
      </div>
    </div>
  );
}
