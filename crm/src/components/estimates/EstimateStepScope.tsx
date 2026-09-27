import React from 'react';
import { CheckSquare, ArrowRight, ArrowLeft, Check, Plus, Minus } from 'lucide-react';
import { ScopeItem } from '@/types/estimateTypes';

interface EstimateStepScopeProps {
  scope: ScopeItem[];
  onChange: (updatedScope: ScopeItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function EstimateStepScope({
  scope,
  onChange,
  onNext,
  onBack,
}: EstimateStepScopeProps) {
  const toggleItem = (id: string) => {
    onChange(
      scope.map((item) =>
        item.id === id && !item.includedInBase
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const updateQuantity = (id: string, delta: number) => {
    onChange(
      scope.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const addOnTotal = scope
    .filter((i) => i.selected && !i.includedInBase)
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="light-glass-panel rounded-3xl p-6 md:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-white/85 dark:border-white/10 space-y-6">
      {/* Title */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
            <CheckSquare size={18} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              3. Scope of Work & Structural Add-Ons
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure flashings, ventilation, wood repairs, gutters, and city permits
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 bg-white/80 border border-slate-200/90 px-3.5 py-2 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Add-ons Subtotal</span>
          <div className="text-lg font-black text-slate-900">${addOnTotal.toLocaleString()}</div>
        </div>
      </div>

      {/* Scope Checklist */}
      <div className="divide-y divide-slate-100 bg-white/70 border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {scope.map((item) => (
          <div
            key={item.id}
            className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
              item.selected ? 'bg-amber-50/30' : 'bg-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                disabled={item.includedInBase}
                onClick={() => toggleItem(item.id)}
                className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  item.selected
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-slate-300 hover:border-amber-400 bg-white'
                } ${item.includedInBase ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
              >
                {item.selected && <Check size={13} className="stroke-[3]" />}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                  {item.includedInBase ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Standard Base Scope
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500">
                      ${item.unitPrice} / {item.unit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Quantity Stepper for Non-Base items */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
              {!item.includedInBase && item.selected && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}

              <div className="text-right min-w-[70px]">
                {item.includedInBase ? (
                  <span className="text-xs font-bold text-emerald-700">INCLUDED</span>
                ) : (
                  <span
                    className={`text-xs font-bold ${
                      item.selected ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    ${(item.unitPrice * item.quantity).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Material</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Next: Review Pricing</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
