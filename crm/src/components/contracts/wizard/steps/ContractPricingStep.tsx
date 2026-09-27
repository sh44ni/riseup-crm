import React from 'react';
import { ContractStudioData, ContractPaymentRow } from '@/types/contractStudioTypes';
import { DollarSign, Plus, Trash2, AlertTriangle, Sparkles } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractPricingStep({ data, onDataChange }: StepProps) {
  const autoSplitPayments = (totalPrice: number) => {
    const dp = Math.min(1000, Math.round(totalPrice * 0.1));
    const remainder = totalPrice - dp;
    const p1 = Math.round(remainder * 0.3);
    const p2 = Math.round(remainder * 0.3);
    const p3 = totalPrice - dp - p1 - p2;

    onDataChange({
      contractPrice: totalPrice,
      downpayment: dp,
      paymentSchedule: [
        { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
        { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
        { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
        { id: '4', number: '4.', description: 'Final Payment (Installation complete & final walkthrough)', amount: p3 },
      ],
    });
  };

  const handleUpdatePaymentRow = (index: number, key: 'description' | 'amount', val: any) => {
    const copy = [...(data.paymentSchedule || [])];
    copy[index] = { ...copy[index], [key]: key === 'amount' ? Number(val) || 0 : val };
    onDataChange({ paymentSchedule: copy });
  };

  const handleAddPaymentRow = () => {
    const count = (data.paymentSchedule || []).length + 1;
    const newRow: ContractPaymentRow = {
      id: `pay-${Date.now()}`,
      number: `${count}.`,
      description: `Milestone Payment ${count}`,
      amount: 0,
    };
    onDataChange({ paymentSchedule: [...(data.paymentSchedule || []), newRow] });
  };

  const handleRemovePaymentRow = (index: number) => {
    onDataChange({
      paymentSchedule: (data.paymentSchedule || []).filter((_, i) => i !== index),
    });
  };

  const scheduledSum = (data.paymentSchedule || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const isBalanced = Math.abs(scheduledSum - (data.contractPrice || 0)) < 1;

  return (
    <div className="space-y-8">
      {/* Contract Price & Downpayment */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Contract Pricing</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Total Contract Price ($)
            </label>
            <div className="relative">
              <input
                type="number"
                value={data.contractPrice}
                onChange={(e) => autoSplitPayments(Number(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
              />
              <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Downpayment ($ max $1,000)
            </label>
            <input
              type="number"
              value={data.downpayment}
              onChange={(e) => onDataChange({ downpayment: Number(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Finance Charge</label>
            <input
              type="text"
              value={data.financeCharge}
              onChange={(e) => onDataChange({ financeCharge: e.target.value })}
              placeholder="N/A"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>
        </div>

        {/* Downpayment Notice Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-[#10263b] text-center">
          THE DOWNPAYMENT MAY NOT EXCEED $1,000.00 OR 10 PERCENT OF THE CONTRACT PRICE, WHICHEVER IS LESS.
        </div>
      </div>

      {/* Progress Payments Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Schedule of Progress Payments</h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Scheduled Sum:{' '}
              <strong className={isBalanced ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                ${scheduledSum.toLocaleString()}
              </strong>{' '}
              / ${(data.contractPrice || 0).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => autoSplitPayments(data.contractPrice || 31000)}
              className="px-2.5 py-1 text-xs font-bold text-[#1a5ba5] hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
              title="Recalculate 4 standard milestone payments"
            >
              <Sparkles size={12} />
              <span>Auto-split</span>
            </button>
            <button
              type="button"
              onClick={handleAddPaymentRow}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus size={12} />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {(data.paymentSchedule || []).map((row, idx) => (
            <div
              key={row.id || idx}
              className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5"
            >
              <span className="w-6 h-6 rounded-md bg-[#10263b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={row.description}
                onChange={(e) => handleUpdatePaymentRow(idx, 'description', e.target.value)}
                placeholder="Payment deliverable description..."
                className="flex-1 text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
              />
              <div className="w-28 relative">
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => handleUpdatePaymentRow(idx, 'amount', e.target.value)}
                  className="w-full text-xs font-bold pl-5 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-right focus:outline-none focus:border-[#1a5ba5]"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePaymentRow(idx)}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                title="Remove Row"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContractPricingStep;
