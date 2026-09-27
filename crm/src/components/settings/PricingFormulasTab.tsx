import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Layers,
  Home,
  DollarSign,
  MapPin,
  Wrench,
  Building,
  Sun,
  SlidersHorizontal,
} from 'lucide-react';
import { PricingConfig, EstimatorPricingRuleItem } from '@/types/settingsTypes';

interface PricingFormulasTabProps {
  pricing: PricingConfig;
  onChange: (updated: PricingConfig) => void;
}

const DEFAULT_RULES: EstimatorPricingRuleItem[] = [
  {
    service_id: 1,
    slug: 'residential',
    name: 'Tile / Shingle Roof',
    price_per_sqft_low: 4.0,
    price_per_sqft_high: 6.2,
    base_fee_low: 500,
    base_fee_high: 950,
    min_sqft: 800,
    max_sqft: 8000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 60,
  },
  {
    service_id: 2,
    slug: 'repair',
    name: 'Leak & Tile Repair',
    price_per_sqft_low: 0.4,
    price_per_sqft_high: 0.8,
    base_fee_low: 100,
    base_fee_high: 600,
    min_sqft: 500,
    max_sqft: 8000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 18,
  },
  {
    service_id: 3,
    slug: 'commercial',
    name: 'Commercial Flat Roof',
    price_per_sqft_low: 5.0,
    price_per_sqft_high: 8.0,
    base_fee_low: 2250,
    base_fee_high: 4000,
    min_sqft: 1000,
    max_sqft: 15000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 60,
  },
  {
    service_id: 4,
    slug: 'solar',
    name: 'Solar + Roofing',
    price_per_sqft_low: 7.5,
    price_per_sqft_high: 11.5,
    base_fee_low: 1500,
    base_fee_high: 3000,
    min_sqft: 1000,
    max_sqft: 10000,
    apr_available: true,
    financing_apr: 0.0,
    financing_term_months: 120,
  },
];

export function PricingFormulasTab({ pricing, onChange }: PricingFormulasTabProps) {
  // Safe Fallback Objects to prevent any unhandled undefined crashes
  const marginGuardrails = pricing?.marginGuardrails || {
    targetGrossMargin: 38.0,
    hardFloorMargin: 32.0,
    salesCommissionRate: 10.0,
  };

  const pitchMultipliers = pricing?.pitchMultipliers || {
    flatTo3_12: 1.0,
    fourTo6_12: 1.15,
    sevenTo9_12: 1.3,
    tenPlus_12: 1.55,
  };

  const storyMultipliers = pricing?.storyMultipliers || {
    oneStory: 1.0,
    twoStory: 1.18,
    threeStoryCoastal: 1.35,
  };

  const tearOffRates = pricing?.tearOffRates || {
    shingle1Layer: 45.0,
    shingle2Layer: 85.0,
    tileConcrete: 120.0,
    woodShake: 145.0,
  };

  const permitFees = pricing?.permitFees || {
    oceanside: 450,
    carlsbad: 485,
    encinitas: 525,
    vista: 420,
  };

  // Live Simulator state for interactive formula verification
  const [simService, setSimService] = useState<string>('residential');
  const [simSqft, setSimSqft] = useState<number>(2750);
  const [simPitch, setSimPitch] = useState<keyof PricingConfig['pitchMultipliers']>('fourTo6_12');
  const [simStory, setSimStory] = useState<keyof PricingConfig['storyMultipliers']>('oneStory');

  const rules = pricing?.pricingRules && pricing.pricingRules.length > 0 ? pricing.pricingRules : DEFAULT_RULES;

  const updatePricingRule = (serviceId: number, field: keyof EstimatorPricingRuleItem, val: any) => {
    const updated = rules.map((r) => {
      if (r.service_id === serviceId) {
        return { ...r, [field]: val };
      }
      return r;
    });
    onChange({
      ...pricing,
      pricingRules: updated,
      marginGuardrails,
      pitchMultipliers,
      storyMultipliers,
      tearOffRates,
      permitFees,
    });
  };

  const updatePitch = (key: keyof PricingConfig['pitchMultipliers'], val: number) => {
    onChange({
      ...pricing,
      pitchMultipliers: {
        ...pitchMultipliers,
        [key]: val,
      },
    });
  };

  const updateStory = (key: keyof PricingConfig['storyMultipliers'], val: number) => {
    onChange({
      ...pricing,
      storyMultipliers: {
        ...storyMultipliers,
        [key]: val,
      },
    });
  };

  const updateTearOff = (key: keyof PricingConfig['tearOffRates'], val: number) => {
    onChange({
      ...pricing,
      tearOffRates: {
        ...tearOffRates,
        [key]: val,
      },
    });
  };

  const updateMargin = (key: keyof PricingConfig['marginGuardrails'], val: number) => {
    onChange({
      ...pricing,
      marginGuardrails: {
        ...marginGuardrails,
        [key]: val,
      },
    });
  };

  const updatePermit = (key: keyof PricingConfig['permitFees'], val: number) => {
    onChange({
      ...pricing,
      permitFees: {
        ...permitFees,
        [key]: val,
      },
    });
  };

  // Simulator Calculation
  const activeSimRule = rules.find((r) => r.slug === simService) || rules[0] || DEFAULT_RULES[0];
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
        return <Home size={18} className="text-[#1878B8]" />;
      case 'repair':
        return <Wrench size={18} className="text-amber-600" />;
      case 'commercial':
        return <Building size={18} className="text-indigo-600" />;
      case 'solar':
        return <Sun size={18} className="text-emerald-600" />;
      default:
        return <Calculator size={18} className="text-[#1878B8]" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================
          SECTION 1: LIVE WEB & CRM ESTIMATOR PRICING RULES (CSLB LINKED)
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1878B8]/15 to-sky-500/20 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-sky-300/40 dark:border-sky-500/30 shadow-2xs">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Live Website & Pipeline Estimator Service Rules
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-black uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected to website hero calculator (<span className="font-mono text-slate-700 dark:text-slate-300">riseuproofing.com</span>) and automated CRM pipeline deal valuations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[#1878B8] dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs font-bold">
              4 Production Services
            </span>
          </div>
        </div>

        {/* 4 Service Rule Cards */}
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
                {/* Low $/sqft */}
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
                        updatePricingRule(
                          rule.service_id,
                          'price_per_sqft_low',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                    />
                  </div>
                </div>

                {/* High $/sqft */}
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
                        updatePricingRule(
                          rule.service_id,
                          'price_per_sqft_high',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Base Fee Low */}
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
                        updatePricingRule(
                          rule.service_id,
                          'base_fee_low',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Base Fee High */}
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
                        updatePricingRule(
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

              {/* Financing & Range limits */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5">
                <span>
                  Bounds: {(rule.min_sqft || 500).toLocaleString()} – {(rule.max_sqft || 12000).toLocaleString()} sq ft
                </span>
                <span className="font-semibold text-[#1878B8] dark:text-sky-400">
                  Formula: Base + (SQFT × Rate)
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ================================================================
            INTERACTIVE REAL-TIME CALCULATOR SIMULATOR & TEST BENCH
            ================================================================ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#071326] to-slate-900 text-white border border-sky-500/20 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-[#38BDF8] flex items-center justify-center border border-sky-400/30">
                <SlidersHorizontal size={14} />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Live Formula Simulator & Deal Valuation Preview
              </h3>
            </div>
            <span className="text-[11px] text-sky-300 font-mono">
              Auto-Calculated in Real-Time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            {/* Service selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Test Service
              </label>
              <select
                value={simService}
                onChange={(e) => setSimService(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-400 cursor-pointer"
              >
                {rules.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sqft input */}
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

            {/* Pitch */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pitch Multiplier
              </label>
              <select
                value={simPitch}
                onChange={(e) => setSimPitch(e.target.value as any)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-400 cursor-pointer"
              >
                <option value="flatTo3_12">0/12–3/12 Flat ({pitchMultipliers.flatTo3_12 || 1.0}x)</option>
                <option value="fourTo6_12">4/12–6/12 Standard ({pitchMultipliers.fourTo6_12 || 1.0}x)</option>
                <option value="sevenTo9_12">7/12–9/12 Moderate ({pitchMultipliers.sevenTo9_12 || 1.15}x)</option>
                <option value="tenPlus_12">10/12+ Steep ({pitchMultipliers.tenPlus_12 || 1.3}x)</option>
              </select>
            </div>

            {/* Stories */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Height Multiplier
              </label>
              <select
                value={simStory}
                onChange={(e) => setSimStory(e.target.value as any)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-400 cursor-pointer"
              >
                <option value="oneStory">1-Story ({storyMultipliers.oneStory || 1.0}x)</option>
                <option value="twoStory">2-Story ({storyMultipliers.twoStory || 1.08}x)</option>
                <option value="threeStoryCoastal">3-Story / Coastal ({storyMultipliers.threeStoryCoastal || 1.22}x)</option>
              </select>
            </div>
          </div>

          {/* Result Output Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-left w-full md:w-auto">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Calculated Pipeline Valuation ({activeSimRule.name} • {simSqft.toLocaleString()} sq ft)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-[#38BDF8] tracking-tight">
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

      {/* ================================================================
          SECTION 2: PROFIT MARGIN GUARDRAILS
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-300/40 dark:border-emerald-500/30">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Gross Profit Margin Guardrails & Commissions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated threshold enforcement for all residential & commercial estimates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold">
              Target: {marginGuardrails.targetGrossMargin}% Gross Margin
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Target Margin */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Target Gross Margin
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {marginGuardrails.targetGrossMargin}%
              </span>
            </div>
            <input
              type="range"
              min="25"
              max="55"
              step="0.5"
              value={marginGuardrails.targetGrossMargin}
              onChange={(e) =>
                updateMargin('targetGrossMargin', parseFloat(e.target.value))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Default margin applied to automated EagleView take-offs.
            </p>
          </div>

          {/* Hard Floor Margin */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Hard Floor Minimum Margin
              </span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {marginGuardrails.hardFloorMargin}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="40"
              step="0.5"
              value={marginGuardrails.hardFloorMargin}
              onChange={(e) =>
                updateMargin('hardFloorMargin', parseFloat(e.target.value))
              }
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quotes below this rate require Owner executive sign-off.
            </p>
          </div>

          {/* Sales Rep Commission */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Sales Commission Rate
              </span>
              <span className="text-base font-black text-sky-600 dark:text-sky-400">
                {marginGuardrails.salesCommissionRate}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={marginGuardrails.salesCommissionRate}
              onChange={(e) =>
                updateMargin('salesCommissionRate', parseFloat(e.target.value))
              }
              className="w-full accent-sky-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Calculated on net realized gross profit per signed contract.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 3: ROOF PITCH & STORY MULTIPLIERS
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pitch Multipliers */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-sky-300/40 dark:border-sky-500/30">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Roof Pitch Labor Multipliers
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Multiplies base installation labor based on slope steepness.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: 'flatTo3_12' as const,
                label: '0/12 to 3/12 (Flat / Low Slope)',
                desc: 'TPO, torch-down, self-adhering roll roofing',
              },
              {
                key: 'fourTo6_12' as const,
                label: '4/12 to 6/12 (Standard Walkable)',
                desc: 'Standard residential pitch, normal footing',
              },
              {
                key: 'sevenTo9_12' as const,
                label: '7/12 to 9/12 (Moderate Steep)',
                desc: 'Roof jacks and toe boards required',
              },
              {
                key: 'tenPlus_12' as const,
                label: '10/12+ (Extreme Steep Slope)',
                desc: 'Full OSHA fall harness & rope arrest systems',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    value={pitchMultipliers[item.key] ?? 1.0}
                    onChange={(e) =>
                      updatePitch(item.key, parseFloat(e.target.value) || 1.0)
                    }
                    className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none"
                  />
                  <span className="font-bold text-slate-500 dark:text-slate-400">x</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Story Height Multipliers */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-300/40 dark:border-amber-500/30">
              <Home size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Story Height & Staging Multipliers
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Compensates for crane lifts, scaffolding, and ladder loading.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: 'oneStory' as const,
                label: 'Single Story (Ground Walkup)',
                desc: 'Standard material drop and dumpster staging',
              },
              {
                key: 'twoStory' as const,
                label: 'Two-Story Structure',
                desc: 'Extended ladder runs and boom conveyor truck',
              },
              {
                key: 'threeStoryCoastal' as const,
                label: '3-Story / Coastal Hillside Staging',
                desc: 'Steep hill drops in Encinitas/Carlsbad cliff properties',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.02"
                    value={storyMultipliers[item.key] ?? 1.0}
                    onChange={(e) =>
                      updateStory(item.key, parseFloat(e.target.value) || 1.0)
                    }
                    className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none"
                  />
                  <span className="font-bold text-slate-500 dark:text-slate-400">x</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 4: TEAR-OFF COSTS & CITY PERMITS
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tear-off Rates */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center justify-center border border-rose-300/40 dark:border-rose-500/30">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tear-Off & Dumpster Rates ($ / SQ)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct disposal cost per roofing square (100 sq ft).
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: 'shingle1Layer' as const,
                label: '1-Layer Asphalt Shingles',
                desc: 'Single layer removal to bare OSB decking',
              },
              {
                key: 'shingle2Layer' as const,
                label: '2-Layer Asphalt Shingles',
                desc: 'Heavy double tear-off + additional dumpster weight',
              },
              {
                key: 'tileConcrete' as const,
                label: 'Concrete or Clay Spanish Tile',
                desc: 'High tonnage disposal + batten strip strip-down',
              },
              {
                key: 'woodShake' as const,
                label: 'Cedar Wood Shake',
                desc: 'Includes 1/2" CDX re-sheathing labor allocation',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    step="5"
                    value={tearOffRates[item.key] ?? 0}
                    onChange={(e) =>
                      updateTearOff(item.key, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none"
                  />
                  <span className="font-bold text-slate-400 dark:text-slate-500">/ SQ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* City Permits Allowances */}
        <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-300/40 dark:border-indigo-500/30">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                North County City Permit Fees
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Flat building department permit allowance added to contracts.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: 'oceanside' as const,
                label: 'City of Oceanside Building Dept',
                desc: 'Online e-Permit portal filing fee',
              },
              {
                key: 'carlsbad' as const,
                label: 'City of Carlsbad Community Development',
                desc: 'Permit fee + smoke detector affidavit',
              },
              {
                key: 'encinitas' as const,
                label: 'City of Encinitas Planning Dept',
                desc: 'Includes coastal review checklist',
              },
              {
                key: 'vista' as const,
                label: 'City of Vista Building Division',
                desc: 'Standard residential reroof permit',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    step="10"
                    value={permitFees[item.key] ?? 0}
                    onChange={(e) =>
                      updatePermit(item.key, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-right text-slate-900 dark:text-white outline-none"
                  />
                  <span className="font-bold text-slate-400 dark:text-slate-500">USD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
