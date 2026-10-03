import React from 'react';
import { DollarSign, MapPin } from 'lucide-react';
import { PricingConfig } from '@/types/settingsTypes';

interface TearOffAndPermitSectionProps {
  tearOffRates: PricingConfig['tearOffRates'];
  permitFees: PricingConfig['permitFees'];
  onUpdateTearOff: (key: keyof PricingConfig['tearOffRates'], val: number) => void;
  onUpdatePermit: (key: keyof PricingConfig['permitFees'], val: number) => void;
}

export function TearOffAndPermitSection({
  tearOffRates,
  permitFees,
  onUpdateTearOff,
  onUpdatePermit,
}: TearOffAndPermitSectionProps) {
  const tearOffItems = [
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
  ];

  const permitItems = [
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
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Tear-off Rates */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center justify-center border border-rose-300/40 dark:border-rose-500/30">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tear-Off &amp; Dumpster Rates ($ / SQ)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Direct disposal cost per roofing square (100 sq ft).
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {tearOffItems.map((item) => (
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
                    onUpdateTearOff(item.key, parseFloat(e.target.value) || 0)
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
          {permitItems.map((item) => (
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
                    onUpdatePermit(item.key, parseFloat(e.target.value) || 0)
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
  );
}
