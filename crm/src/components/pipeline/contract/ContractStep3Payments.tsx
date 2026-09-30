import React from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { ContractFormState, PaymentRow } from './contractTypes';
import { labelCls, inputCls, sumPayments, formatMoney } from './contractTypes';

interface Props {
  form: ContractFormState;
  onChange: (patch: Partial<ContractFormState>) => void;
}

export function ContractStep3Payments({ form, onChange }: Props) {
  const updateForm = (key: keyof ContractFormState, val: any) => onChange({ [key]: val });

  const updatePaymentRow = (idx: number, field: keyof PaymentRow, val: string) => {
    const updated = form.paymentRows.map((r, i) =>
      i === idx ? { ...r, [field]: val } : r
    );
    updateForm('paymentRows', updated);
  };
  const addPaymentRow = () =>
    updateForm('paymentRows', [
      ...form.paymentRows,
      { number: String(form.paymentRows.length + 1), description: '', amount: '' },
    ]);
  const removePaymentRow = (idx: number) =>
    updateForm('paymentRows', form.paymentRows.filter((_, i) => i !== idx));

  const totalPayments = sumPayments(form.paymentRows);
  const contractPriceNum = parseFloat(form.contractPrice.replace(/[^0-9.]/g, '')) || 0;
  const totalMismatch =
    form.paymentRows.length > 0 &&
    contractPriceNum > 0 &&
    Math.abs(totalPayments - contractPriceNum) > 0.5;

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Finance Charge ($)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.financeCharge}
          onChange={(e) => updateForm('financeCharge', e.target.value)}
          className={inputCls}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={labelCls + ' mb-0'}>Payment Installments</span>
          <button
            type="button"
            onClick={addPaymentRow}
            className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            Add Row
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Description</div>
          <div className="col-span-4">Amount ($)</div>
          <div className="col-span-1" />
        </div>

        {form.paymentRows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1">
              <input
                type="text"
                value={row.number}
                onChange={(e) => updatePaymentRow(idx, 'number', e.target.value)}
                className={inputCls + ' text-center'}
                maxLength={2}
              />
            </div>
            <div className="col-span-6">
              <input
                type="text"
                value={row.description}
                onChange={(e) => updatePaymentRow(idx, 'description', e.target.value)}
                className={inputCls}
                placeholder="Milestone description"
              />
            </div>
            <div className="col-span-4">
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.amount}
                onChange={(e) => updatePaymentRow(idx, 'amount', e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-1 flex justify-center">
              <button
                type="button"
                onClick={() => removePaymentRow(idx)}
                disabled={form.paymentRows.length <= 1}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {/* Total row */}
        <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200 dark:border-white/10">
          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
            Payment Schedule Total
          </span>
          <span
            className={`text-sm font-black ${
              totalMismatch
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatMoney(totalPayments)}
          </span>
        </div>

        {totalMismatch && (
          <div className="flex items-center gap-2 px-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle size={13} />
            <span>
              Total ({formatMoney(totalPayments)}) does not match Contract Price (
              {formatMoney(contractPriceNum)}). Please adjust before continuing.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
