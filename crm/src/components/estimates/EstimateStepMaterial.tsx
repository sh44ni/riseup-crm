import React from 'react';
import { Layers, ArrowRight, ArrowLeft, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { ROOFING_MATERIALS } from '@/data/estimateData';
import { MaterialSelection, HomeownerSpecs } from '@/types/estimateTypes';

interface EstimateStepMaterialProps {
  material: MaterialSelection;
  specs: HomeownerSpecs;
  onChange: (updated: MaterialSelection) => void;
  onNext: () => void;
  onBack: () => void;
}

export function EstimateStepMaterial({
  material,
  specs,
  onChange,
  onNext,
  onBack,
}: EstimateStepMaterialProps) {
  const handleSelectMaterial = (mat: typeof ROOFING_MATERIALS[0]) => {
    onChange({
      ...material,
      materialId: mat.id,
      materialName: mat.name,
      costPerSq: mat.baseCostPerSq,
      warranty: mat.warranty,
      selectedColor: mat.colors[0],
    });
  };

  const handleUnderlaymentChange = (
    type: MaterialSelection['underlayment'],
    cost: number
  ) => {
    onChange({ ...material, underlayment: type, underlaymentCostPerSq: cost });
  };

  const selectedMaterialObj =
    ROOFING_MATERIALS.find((m) => m.id === material.materialId) || ROOFING_MATERIALS[0];

  return (
    <div className="light-glass-panel rounded-3xl p-6 md:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-white/85 dark:border-white/10 space-y-6">
      {/* Title */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
          <Layers size={18} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            2. Primary Roofing Material & Color Selection
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Select high-performance roofing material and engineered underlayment system for {specs.squares} squares
          </p>
        </div>
      </div>

      {/* Material Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROOFING_MATERIALS.map((mat) => {
          const isSelected = material.materialId === mat.id;
          const materialSubtotal = mat.baseCostPerSq * specs.squares;

          return (
            <div
              key={mat.id}
              onClick={() => handleSelectMaterial(mat)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                  : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {mat.brand}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {mat.name}
                    </h3>
                  </div>

                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check size={14} />
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                  {mat.description}
                </p>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/80 mb-3">
                  <ShieldCheck size={13} className="shrink-0" />
                  <span className="truncate">{mat.warranty}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900">${mat.baseCostPerSq}</span>
                  <span className="text-[10px] text-slate-400"> / sq</span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-amber-900">
                    ${materialSubtotal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Est. Base Total</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Color Selection for Selected Material */}
      <div className="pt-2">
        <label className="text-xs font-bold text-slate-800 block mb-2">
          Selected Material Finish / Color: <strong className="text-amber-600">{material.selectedColor}</strong>
        </label>
        <div className="flex flex-wrap gap-2">
          {selectedMaterialObj.colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...material, selectedColor: c })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                material.selectedColor === c
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Underlayment Selection */}
      <div className="pt-2">
        <label className="text-xs font-bold text-slate-800 block mb-2">
          Underlayment Barrier System
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleUnderlaymentChange('standard_felt', 0)}
            className={`p-3.5 rounded-xl text-xs font-bold transition-all border text-left ${
              material.underlayment === 'standard_felt'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="font-black text-slate-900">Standard #30 Asphalt Felt</div>
            <div className="text-[11px] text-slate-500 font-normal mt-0.5">Base code compliant barrier</div>
            <div className="text-xs font-bold text-emerald-700 mt-2">Included (+$0/sq)</div>
          </button>

          <button
            type="button"
            onClick={() => handleUnderlaymentChange('premium_synthetic', 18)}
            className={`p-3.5 rounded-xl text-xs font-bold transition-all border text-left ${
              material.underlayment === 'premium_synthetic'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="font-black text-slate-900">Dual-Layer Synthetic Barrier</div>
            <div className="text-[11px] text-slate-500 font-normal mt-0.5">Tear-proof, UV resistant breathable membrane</div>
            <div className="text-xs font-bold text-amber-800 mt-2">+$18/sq (+$450 total)</div>
          </button>

          <button
            type="button"
            onClick={() => handleUnderlaymentChange('ice_and_water', 35)}
            className={`p-3.5 rounded-xl text-xs font-bold transition-all border text-left ${
              material.underlayment === 'ice_and_water'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="font-black text-slate-900">Self-Adhered High-Temp Shield</div>
            <div className="text-[11px] text-slate-500 font-normal mt-0.5">Full waterproof deck seal around nail penetrations</div>
            <div className="text-xs font-bold text-amber-800 mt-2">+$35/sq (+$875 total)</div>
          </button>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Specs</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Next: Scope of Work</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
