import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ArrowLeft,
  Check,
  ShieldCheck,
  Send,
  FileDown,
  Sparkles,
  Award,
  CreditCard,
  Building2,
  FileCheck2,
  CheckSquare,
} from 'lucide-react';
import { HomeownerSpecs, MaterialSelection, ScopeItem } from '@/types/estimateTypes';
import { useToast } from '@/context/ToastContext';

interface EstimateStepPricingProps {
  specs: HomeownerSpecs;
  material: MaterialSelection;
  scope: ScopeItem[];
  onBack: () => void;
  onSaveEstimate: (selectedTier: 'good' | 'better' | 'best') => void;
}

export function EstimateStepPricing({
  specs,
  material,
  scope,
  onBack,
  onSaveEstimate,
}: EstimateStepPricingProps) {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<'good' | 'better' | 'best'>('better');
  const [clientSent, setClientSent] = useState(false);

  // Dynamic Math Engine
  // 1. Tear-off cost
  const tearOffTotal = specs.squares * specs.tearOffCostPerSq;

  // 2. Base Material & Labor cost adjusted for pitch and stories
  const difficultyMultiplier = specs.pitchMultiplier * specs.storyMultiplier;
  const rawMaterialAndLabor = specs.squares * material.costPerSq * difficultyMultiplier;

  // 3. Add-ons subtotal
  const addOnsTotal = scope
    .filter((i) => i.selected && !i.includedInBase)
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // Good Tier (Silver): Base material + standard felt + minimal add-ons
  const goodTotal = Math.round(rawMaterialAndLabor * 0.92 + tearOffTotal + addOnsTotal * 0.6);

  // Better Tier (Gold - Recommended): Premium synthetic + all selected add-ons
  const betterTotal = Math.round(
    rawMaterialAndLabor + tearOffTotal + addOnsTotal + specs.squares * 18
  );

  // Best Tier (Platinum): High-temp self-adhered barrier + premium warranty + all add-ons + free inspection
  const bestTotal = Math.round(
    rawMaterialAndLabor * 1.18 + tearOffTotal + addOnsTotal + specs.squares * 35 + 1200
  );

  const getTierPrice = (tier: 'good' | 'better' | 'best') => {
    if (tier === 'good') return goodTotal;
    if (tier === 'better') return betterTotal;
    return bestTotal;
  };

  const getMonthlyFinancing = (total: number) => {
    // Standard 120-month roofing loan calculation (~$12 per $1,000)
    return Math.round((total / 1000) * 12.8);
  };

  const currentSelectedPrice = getTierPrice(selectedTier);
  const estimatedCost = Math.round(currentSelectedPrice * 0.61); // 39% gross margin
  const grossProfit = currentSelectedPrice - estimatedCost;
  const marginPct = Math.round((grossProfit / currentSelectedPrice) * 100);

  const handleSendToClient = () => {
    setClientSent(true);
    setTimeout(() => setClientSent(false), 4000);
  };

  return (
    <div className="light-glass-panel rounded-3xl p-6 md:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-white/85 dark:border-white/10 space-y-6">
      {/* Title & Estimator Margin Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
            <DollarSign size={18} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              4. Multi-Tier Proposal & Live Pricing Matrix
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Good / Better / Best packages for {specs.customerName} ({specs.squares} SQ • {specs.city})
            </p>
          </div>
        </div>

        {/* Estimator Margin Intelligence Capsule */}
        <div className="flex items-center gap-3 bg-white/90 border border-slate-200/90 rounded-2xl px-4 py-2 shadow-2xs">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Est. Margin</div>
            <div className="text-sm font-black text-emerald-600">{marginPct}% Gross</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gross Profit</div>
            <div className="text-sm font-black text-slate-900">${grossProfit.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 3-TIER COMPARISON CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. SILVER (Good) */}
        <div
          onClick={() => setSelectedTier('good')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
            selectedTier === 'good'
              ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/20'
              : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              TIER 1 • VALUE BUILD
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">Silver Package</h3>
            <p className="text-xs text-slate-500 mt-1">
              Standard code-compliant roof replacement with manufacturer materials.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-2xl font-black text-slate-900">
                ${goodTotal.toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                or <strong className="text-slate-900">${getMonthlyFinancing(goodTotal)}/mo</strong> with 120-mo financing
              </div>
            </div>

            <div className="space-y-2 mt-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span>{material.materialName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span>Standard #30 Asphalt Felt Barrier</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span>25-Year Manufacturer Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span>5-Year Rise Up Workmanship Guarantee</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100">
            <button
              type="button"
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedTier === 'good'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {selectedTier === 'good' ? 'Selected Package' : 'Choose Silver'}
            </button>
          </div>
        </div>

        {/* 2. GOLD (Better - Recommended) */}
        <div
          onClick={() => setSelectedTier('better')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
            selectedTier === 'better'
              ? 'bg-gradient-to-b from-amber-50/90 to-white border-amber-400 shadow-xl ring-2 ring-amber-500/30 -translate-y-1'
              : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs'
          }`}
        >
          {/* Most Popular Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
            <Sparkles size={11} />
            <span>MOST POPULAR CHOICE</span>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
              TIER 2 • ENHANCED PROTECTION
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">Gold Package</h3>
            <p className="text-xs text-slate-500 mt-1">
              Dual-layer synthetic shield with complete attic ventilation and permit package.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-3xl font-black text-slate-900">
                ${betterTotal.toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                or <strong className="text-slate-900">${getMonthlyFinancing(betterTotal)}/mo</strong> with 120-mo financing
              </div>
            </div>

            <div className="space-y-2 mt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Check size={13} className="text-amber-600 shrink-0" />
                <span className="font-bold">{material.materialName} ({material.selectedColor})</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-amber-600 shrink-0" />
                <span>Dual-Layer Breathable Synthetic Barrier</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-amber-600 shrink-0" />
                <span>50-Year Non-Prorated System Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-amber-600 shrink-0" />
                <span>10-Year Certified Workmanship Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-amber-600 shrink-0" />
                <span>Ridge Vent Continuous Ventilation Included</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100">
            <button
              type="button"
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedTier === 'better'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {selectedTier === 'better' ? 'Selected Package ✓' : 'Choose Gold'}
            </button>
          </div>
        </div>

        {/* 3. PLATINUM (Best) */}
        <div
          onClick={() => setSelectedTier('best')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
            selectedTier === 'best'
              ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/20'
              : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              TIER 3 • MAXIMUM LIFETIME SHIELD
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">Platinum Package</h3>
            <p className="text-xs text-slate-500 mt-1">
              Self-adhered ice & water shield deck seal with lifetime labor and annual drone audits.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-2xl font-black text-slate-900">
                ${bestTotal.toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                or <strong className="text-slate-900">${getMonthlyFinancing(bestTotal)}/mo</strong> with 120-mo financing
              </div>
            </div>

            <div className="space-y-2 mt-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Check size={13} className="text-teal-600 shrink-0" />
                <span className="font-bold">{material.materialName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-teal-600 shrink-0" />
                <span>Full High-Temp Self-Adhered Waterproof Membrane</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-teal-600 shrink-0" />
                <span>Lifetime Transferrable System Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-teal-600 shrink-0" />
                <span>Lifetime Rise Up Workmanship Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-teal-600 shrink-0" />
                <span>2-Year Complimentary Annual Drone Audit</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100">
            <button
              type="button"
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedTier === 'best'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {selectedTier === 'best' ? 'Selected Package' : 'Choose Platinum'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Hub (Download, SMS, DocuSign, Save) */}
      <div className="p-4 bg-white/90 border border-slate-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendToClient}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Send size={13} />
            <span>{clientSent ? 'Proposal Sent via SMS & Email!' : 'Deliver Proposal to Client'}</span>
          </button>

          <button
            type="button"
            onClick={() => toast.success(`Generated official PDF for ${specs.customerName} - $${currentSelectedPrice.toLocaleString()}`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <FileDown size={13} className="text-slate-500" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => toast.success(`DocuSign contract envelope generated for ${specs.customerName} (${selectedTier.toUpperCase()} Package)!`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <FileCheck2 size={13} className="text-slate-500" />
            <span>DocuSign Envelope</span>
          </button>

          <Link
            to="/tasks"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-black text-amber-900 shadow-2xs transition-all cursor-pointer"
          >
            <CheckSquare size={13} className="text-amber-700" />
            <span>Schedule Follow-Up Task</span>
          </Link>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Selected: <strong className="text-slate-900 uppercase">{selectedTier} Package</strong> • Total: <strong className="text-emerald-700 font-bold">${currentSelectedPrice.toLocaleString()}</strong>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Scope</span>
        </button>

        <button
          onClick={() => onSaveEstimate(selectedTier)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Check size={14} />
          <span>Save Proposal to CRM Registry</span>
        </button>
      </div>
    </div>
  );
}
