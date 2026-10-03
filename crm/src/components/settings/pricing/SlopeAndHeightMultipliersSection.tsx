import React from 'react';
import { Home, Layers } from 'lucide-react';
import { PricingConfig } from '@/types/settingsTypes';

interface SlopeAndHeightMultipliersSectionProps {
  pitchMultipliers: PricingConfig['pitchMultipliers'];
  storyMultipliers: PricingConfig['storyMultipliers'];
  onUpdatePitch: (key: keyof PricingConfig['pitchMultipliers'], val: number) => void;
  onUpdateStory: (key: keyof PricingConfig['storyMultipliers'], val: number) => void;
}

export function SlopeAndHeightMultipliersSection({
  pitchMultipliers,
  storyMultipliers,
  onUpdatePitch,
  onUpdateStory,
}: SlopeAndHeightMultipliersSectionProps) {
  const pitchItems = [
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
  ];

  const storyItems = [
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
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Pitch Multipliers */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-brand-600 dark:text-sky-400 flex items-center justify-center border border-sky-300/40 dark:border-sky-500/30">
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
          {pitchItems.map((item) => (
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
                    onUpdatePitch(item.key, parseFloat(e.target.value) || 1.0)
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
              Story Height &amp; Staging Multipliers
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Compensates for crane lifts, scaffolding, and ladder loading.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {storyItems.map((item) => (
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
                    onUpdateStory(item.key, parseFloat(e.target.value) || 1.0)
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
  );
}
