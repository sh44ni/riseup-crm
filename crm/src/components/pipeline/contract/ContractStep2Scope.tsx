import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ContractFormState, ScopeSection } from './contractTypes';
import { labelCls, inputCls, textareaCls, autoSplitPayments } from './contractTypes';

interface Props {
  form: ContractFormState;
  onChange: (patch: Partial<ContractFormState>) => void;
}

export function ContractStep2Scope({ form, onChange }: Props) {
  const updateForm = (key: keyof ContractFormState, val: any) => onChange({ [key]: val });

  const handlePriceChange = (val: string) => {
    const patch: Partial<ContractFormState> = { contractPrice: val };
    const rows = autoSplitPayments(val);
    if (rows.length) {
      patch.paymentRows = rows;
      const dp = parseFloat(val.replace(/[^0-9.]/g, ''));
      if (!isNaN(dp)) patch.downpayment = String(Math.round(dp * 0.1));
    }
    onChange(patch);
  };

  const updateSection = (idx: number, field: keyof ScopeSection, val: string) => {
    const updated = form.scopeSections.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    updateForm('scopeSections', updated);
  };
  const addSection = () =>
    updateForm('scopeSections', [
      ...form.scopeSections,
      { heading: 'New Section', text: '' },
    ]);
  const removeSection = (idx: number) =>
    updateForm('scopeSections', form.scopeSections.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Scope Title</label>
        <input
          type="text"
          value={form.scopeTitle}
          onChange={(e) => updateForm('scopeTitle', e.target.value)}
          className={inputCls}
          placeholder="e.g. Spanish S-Tile – Roofing Project"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Contract Price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.contractPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            className={inputCls}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelCls}>Downpayment / Deposit ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.downpayment}
            onChange={(e) => updateForm('downpayment', e.target.value)}
            className={inputCls}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Scope Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={labelCls + ' mb-0'}>Scope Sections</span>
          <button
            type="button"
            onClick={addSection}
            className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            Add Section
          </button>
        </div>

        {form.scopeSections.map((sec, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03] space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sec.heading}
                onChange={(e) => updateSection(idx, 'heading', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Section heading"
              />
              <button
                type="button"
                onClick={() => removeSection(idx)}
                disabled={form.scopeSections.length <= 1}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Remove section"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              rows={3}
              value={sec.text}
              onChange={(e) => updateSection(idx, 'text', e.target.value)}
              className={textareaCls}
              placeholder="Describe the scope for this section…"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
