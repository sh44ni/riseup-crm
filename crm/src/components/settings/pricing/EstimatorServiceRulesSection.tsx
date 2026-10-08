import React, { useState } from 'react';
import { Building, Calculator, Home, SlidersHorizontal, Sun, Wrench } from 'lucide-react';
import { EstimatorPricingRuleItem, PricingConfig } from '@/types/settingsTypes';
import { CrmSelect } from '@/components/common/CrmSelect';

interface EstimatorServiceRulesSectionProps {
  rules: EstimatorPricingRuleItem[];
  pitchMultipliers: PricingConfig['pitchMultipliers'];
  storyMultipliers: PricingConfig['storyMultipliers'];
  onUpdatePricingRule: (
    serviceId: number,
    field: keyof EstimatorPricingRuleItem,
    val: number | string | boolean
  ) => void;
}

export function EstimatorServiceRulesSection({
  rules,
  pitchMultipliers,
  storyMultipliers,
  onUpdatePricingRule,
}: EstimatorServiceRulesSectionProps) {
  const [simService, setSimService] = useState<string>('residential');
  const [simSqft, setSimSqft] = useState<number>(2750);
  const [simPitch, setSimPitch] = useState<keyof PricingConfig['pitchMultipliers']>('fourTo6_12');
  const [simStory, setSimStory] = useState<keyof PricingConfig['storyMultipliers']>('oneStory');

  const activeSimRule = rules.find((r) => r.slug === simService) || rules[0];
  const pitchMult = pitchMultipliers[simPitch] ?? 1.0;
  const storyMult = storyMultipliers[simStory] ?? 1.0;
  const combinedMult = pitchMult * storyMult;

  const baseLow = activeSimRule?.base_fee_low ?? 500;
  const baseHigh = activeSimRule?.base_fee_high ?? 950;
  const rateLow = activeSimRule?.price_per_sqft_low ?? 4.0;
  const rateHigh = activeSimRule?.price_per_sqft_high ?? 6.2;
  const termMonths = activeSimRule?.financing_term_months || 60;

  const simLow = Math.round((baseLow + simSqft * rateLow) * combinedMult);
  const simHigh = Math.round((baseHigh + simSqft * rateHigh) * combinedMult);
  const simMidpoint = Math.round((simLow + simHigh) / 2);
  const simMonthlyLow = Math.round(simLow / termMonths);
  const simMonthlyHigh = Math.round(simHigh / termMonths);

  const getServiceIcon = (slug: string) => {
    switch (slug) {
      case 'residential':
        return <Home size={18} className="text-brand-600 dark:text-sky-400" />;
      case 'repair':
        return <Wrench size={18} className="text-amber-600" />;
      case 'commercial':
        return <Building size={18} className="text-indigo-600" />;
      case 'solar':
        return <Sun size={18} className="text-emerald-600" />;
      default:
        return <Calculator size={18} className="text-brand-600 dark:text-sky-400" />;
    }
  };

  return (
    <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-brand-600 dark:text-sky-400 flex items-center justify-center border border-sky-300/40 dark:border-sky-500/30 shadow-2xs">
            <Calculator size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Live Website &amp; Pipeline Estimator Service Rules
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-black uppercase tracking-wider">
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connected to website hero calculator (riseuproofing.com) and automated CRM pipeline deal valuations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-brand-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs font-bold">
            {rules.length} Production Services
          </span>
        </div>
      </div>

      {/* Service Rule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rules.map((rule) => (
          <div
            key={rule.service_id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs hover:shadow-xs transition-all space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  {getServiceIcon(rule.slug)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {rule.name}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    slug: {rule.slug}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                {rule.financing_apr ?? 0}% APR • {rule.financing_term_months ?? 60}mo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Price Low ($ / sq ft)
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.05"
                    value={rule.price_per_sqft_low}
                    onChange={(e) =>
                      onUpdatePricingRule(
                        rule.service_id,
                        'price_per_sqft_low',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Price High ($ / sq ft)
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.05"
                    value={rule.price_per_sqft_high}
                    onChange={(e) =>
                      onUpdatePricingRule(
                        rule.service_id,
                        'price_per_sqft_high',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Base Setup Fee Low ($)
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    step="50"
                    value={rule.base_fee_low}
                    onChange={(e) =>
                      onUpdatePricingRule(
                        rule.service_id,
                        'base_fee_low',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Base Setup Fee High ($)
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    step="50"
                    value={rule.base_fee_high}
                    onChange={(e) =>
                      onUpdatePricingRule(
                        rule.service_id,
                        'base_fee_high',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5">
              <span>
                Bounds: {(rule.min_sqft || 500).toLocaleString()} – {(rule.max_sqft || 12000).toLocaleString()} sq ft
              </span>
              <span className="font-semibold text-brand-600 dark:text-sky-400">
                Formula: Base + (SQFT × Rate)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Test Bench Simulator */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-sky-500/20 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <SlidersHorizontal size={14} />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Live Formula Simulator &amp; Deal Valuation Preview
            </h3>
          </div>
          <span className="text-[11px] text-sky-300 font-mono">
            Auto-Calculated in Real-Time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Test Service
            </label>
            <CrmSelect
              value={simService}
              onChange={setSimService}
              options={rules.map((r) => ({
                value: r.slug,
                label: r.name,
              }))}
              triggerClassName="bg-slate-800/90 border-slate-700 text-white font-bold text-xs py-2 hover:bg-slate-800"
              menuClassName="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Roof Area (SQFT)
            </label>
            <input
              type="number"
              step="50"
              value={simSqft}
              onChange={(e) => setSimSqft(Math.max(100, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pitch Multiplier
            </label>
            <CrmSelect
              value={simPitch}
              onChange={(val) => setSimPitch(val as any)}
              options={[
                { value: 'flatTo3_12', label: `0/12–3/12 Flat (${pitchMultipliers.flatTo3_12 || 1.0}x)` },
                { value: 'fourTo6_12', label: `4/12–6/12 Standard (${pitchMultipliers.fourTo6_12 || 1.0}x)` },
                { value: 'sevenTo9_12', label: `7/12–9/12 Moderate (${pitchMultipliers.sevenTo9_12 || 1.15}x)` },
                { value: 'tenPlus_12', label: `10/12+ Steep (${pitchMultipliers.tenPlus_12 || 1.3}x)` },
              ]}
              triggerClassName="bg-slate-800/90 border-slate-700 text-white font-bold text-xs py-2 hover:bg-slate-800"
              menuClassName="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Height Multiplier
            </label>
            <CrmSelect
              value={simStory}
              onChange={(val) => setSimStory(val as any)}
              options={[
                { value: 'oneStory', label: `1-Story (${storyMultipliers.oneStory || 1.0}x)` },
                { value: 'twoStory', label: `2-Story (${storyMultipliers.twoStory || 1.08}x)` },
                { value: 'threeStoryCoastal', label: `3-Story / Coastal (${storyMultipliers.threeStoryCoastal || 1.22}x)` },
              ]}
              triggerClassName="bg-slate-800/90 border-slate-700 text-white font-bold text-xs py-2 hover:bg-slate-800"
              menuClassName="bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-left w-full md:w-auto">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
              Calculated Pipeline Valuation ({activeSimRule.name} • {simSqft.toLocaleString()} sq ft)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight">
                ${simMidpoint.toLocaleString()}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Range: ${simLow.toLocaleString()} – ${simHigh.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Formula: [${baseLow} + ({simSqft} × ${rateLow})] to [${baseHigh} + ({simSqft} × ${rateHigh})]
              {combinedMult !== 1 && ` × ${combinedMult.toFixed(2)}x factor`}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
            <div className="px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-400/20 text-center">
              <span className="text-[10px] font-bold text-sky-300 block uppercase">
                Monthly Financing ({activeSimRule.financing_apr ?? 0}% APR)
              </span>
              <span className="text-sm font-black text-white">
                ${simMonthlyLow} – ${simMonthlyHigh} / mo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
