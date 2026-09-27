import React from 'react';
import { Home, ArrowRight, ChevronDown } from 'lucide-react';
import { HomeownerSpecs } from '@/types/estimateTypes';

interface EstimateStepSpecsProps {
  specs: HomeownerSpecs;
  onChange: (updated: HomeownerSpecs) => void;
  onNext: () => void;
}

export function EstimateStepSpecs({ specs, onChange, onNext }: EstimateStepSpecsProps) {
  const handleSquaresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, parseInt(e.target.value) || 0);
    onChange({ ...specs, squares: val });
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    let mult = 1.0;
    if (val.startsWith('6:12')) mult = 1.1;
    if (val.startsWith('8:12')) mult = 1.2;
    if (val.startsWith('10:12')) mult = 1.35;
    onChange({ ...specs, pitch: val, pitchMultiplier: mult });
  };

  const handleStoriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    let mult = 1.0;
    if (val.includes('2 Story')) mult = 1.12;
    if (val.includes('3 Story')) mult = 1.25;
    onChange({ ...specs, stories: val, storyMultiplier: mult });
  };

  const handleTearOffChange = (type: HomeownerSpecs['tearOff'], cost: number) => {
    onChange({ ...specs, tearOff: type, tearOffCostPerSq: cost });
  };

  return (
    <div className="light-glass-panel rounded-3xl p-6 md:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-white/85 dark:border-white/10 space-y-6">
      {/* Title matching mockup */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
          <Home size={18} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            1. Homeowner & Property Specs
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Enter customer contact info and roof square footage measurements
          </p>
        </div>
      </div>

      {/* Contact Info Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Customer Name *
          </label>
          <input
            type="text"
            value={specs.customerName}
            onChange={(e) => onChange({ ...specs, customerName: e.target.value })}
            placeholder="e.g. David Martinez"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Phone Number
          </label>
          <input
            type="text"
            value={specs.phone}
            onChange={(e) => onChange({ ...specs, phone: e.target.value })}
            placeholder="(760) 000-0000"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Contact Info Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Street Address
          </label>
          <input
            type="text"
            value={specs.streetAddress}
            onChange={(e) => onChange({ ...specs, streetAddress: e.target.value })}
            placeholder="e.g. 742 Evergreen Terrace"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            City
          </label>
          <input
            type="text"
            value={specs.city}
            onChange={(e) => onChange({ ...specs, city: e.target.value })}
            placeholder="Escondido"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Subheader: ROOFING DIMENSIONS & PITCH */}
      <div className="pt-3">
        <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3">
          ROOFING DIMENSIONS & PITCH
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Squares */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Roof Squares (100 sq ft = 1 sq)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min={1}
                max={200}
                value={specs.squares}
                onChange={handleSquaresChange}
                className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-sm font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
              />
              <span className="absolute right-2.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-black tracking-wide">
                SQ
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">
              ≈ {(specs.squares * 100).toLocaleString()} sq ft roof surface
            </div>
          </div>

          {/* Slope / Pitch */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Roof Slope / Pitch
            </label>
            <div className="relative flex items-center">
              <select
                value={specs.pitch}
                onChange={handlePitchChange}
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 appearance-none transition-all shadow-2xs"
              >
                <option value="4:12 (Standard Low Pitch)">4:12 (Standard Low Pitch)</option>
                <option value="6:12 (Moderate Pitch +10%)">6:12 (Moderate Pitch +10%)</option>
                <option value="8:12 (Steep Slope +20%)">8:12 (Steep Slope +20%)</option>
                <option value="10:12+ (Severe Slope +35%)">10:12+ (Severe Slope +35%)</option>
              </select>
              <div className="absolute right-3 flex items-center pointer-events-none gap-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {specs.pitchMultiplier === 1 ? 'Standard' : `+${Math.round((specs.pitchMultiplier - 1) * 100)}%`}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Building Stories */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Building Stories
            </label>
            <div className="relative flex items-center">
              <select
                value={specs.stories}
                onChange={handleStoriesChange}
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 appearance-none transition-all shadow-2xs"
              >
                <option value="1 Story (Ground level)">1 Story (Ground level)</option>
                <option value="2 Story (Staging +12%)">2 Story (Staging +12%)</option>
                <option value="3 Story Custom (+25%)">3 Story Custom (+25%)</option>
              </select>
              <div className="absolute right-3 flex items-center pointer-events-none gap-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {specs.storyMultiplier === 1 ? 'Base' : `+${Math.round((specs.storyMultiplier - 1) * 100)}%`}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tear-Off Existing Roof */}
      <div className="pt-2">
        <label className="text-xs font-bold text-slate-800 block mb-2">
          Tear-Off Existing Roof
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleTearOffChange('1_layer', 45)}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${
              specs.tearOff === '1_layer'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            1 Layer Tear-Off ($45/sq)
          </button>

          <button
            type="button"
            onClick={() => handleTearOffChange('2_layers', 85)}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${
              specs.tearOff === '2_layers'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            2 Layers Tear-Off ($85/sq)
          </button>

          <button
            type="button"
            onClick={() => handleTearOffChange('overlay', 0)}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${
              specs.tearOff === 'overlay'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            Overlay (No Tear-Off)
          </button>
        </div>
      </div>

      {/* Bottom Right CTA Button */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Next: Material Selection</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
