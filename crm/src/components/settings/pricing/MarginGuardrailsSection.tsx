import React from 'react';
import { TrendingUp } from 'lucide-react';
import { PricingConfig } from '@/types/settingsTypes';

interface MarginGuardrailsSectionProps {
  marginGuardrails: PricingConfig['marginGuardrails'];
  onUpdateMargin: (key: keyof PricingConfig['marginGuardrails'], val: number) => void;
}

export function MarginGuardrailsSection({
  marginGuardrails,
  onUpdateMargin,
}: MarginGuardrailsSectionProps) {
  return (
    <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-300/40 dark:border-emerald-500/30">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Gross Profit Margin Guardrails &amp; Commissions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated threshold enforcement for all residential &amp; commercial estimates.
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
              onUpdateMargin('targetGrossMargin', parseFloat(e.target.value))
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
              onUpdateMargin('hardFloorMargin', parseFloat(e.target.value))
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
              onUpdateMargin('salesCommissionRate', parseFloat(e.target.value))
            }
            className="w-full accent-sky-600 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Calculated on net realized gross profit per signed contract.
          </p>
        </div>
      </div>
    </div>
  );
}
