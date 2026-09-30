import React from 'react';
import { ContractStudioData, ContractPaymentRow } from '@/types/contractStudioTypes';
import { CreditCard, Plus, Trash2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractPaymentScheduleStep({ data, onDataChange }: StepProps) {
  const paymentRows = data.paymentSchedule || [];
  const totalAllocated = paymentRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const contractTotal = Number(data.contractPrice) || 0;
  const isBalanced = totalAllocated === contractTotal;
  const difference = contractTotal - totalAllocated;

  const handleRowAmountChange = (index: number, valStr: string) => {
    const raw = parseFloat(valStr.replace(/[^0-9.]/g, '')) || 0;
    const updated = [...paymentRows];
    updated[index] = { ...updated[index], amount: raw };
    onDataChange({ paymentSchedule: updated });
  };

  const handleRowDescChange = (index: number, desc: string) => {
    const updated = [...paymentRows];
    updated[index] = { ...updated[index], description: desc };
    onDataChange({ paymentSchedule: updated });
  };

  const handleAutoSplit = () => {
    const dp = Math.min(1000, Math.round(contractTotal * 0.1));
    const rem = Math.max(0, contractTotal - dp);
    const p1 = Math.round(rem * 0.3);
    const p2 = Math.round(rem * 0.3);
    const p3 = Math.max(0, contractTotal - dp - p1 - p2);

    onDataChange({
      downpayment: dp,
      paymentSchedule: [
        { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
        { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
        { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
        { id: '4', number: '4.', description: 'Final Payment (Installation complete & walkthrough)', amount: p3 },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Balance indicator */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CreditCard size={16} className="text-[#1a5ba5]" /> Progress Payment Milestones
        </h3>

        <div className="flex items-center gap-2">
          {isBalanced ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={12} className="text-emerald-600" />
              100% Balanced ($
              {contractTotal.toLocaleString()})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle size={12} className="text-amber-600" />
              Diff: ${Math.abs(difference).toLocaleString()} {difference > 0 ? 'Remaining' : 'Over'}
            </span>
          )}

          <button
            type="button"
            onClick={handleAutoSplit}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#1a5ba5] hover:bg-sky-50 border border-sky-200 transition-colors flex items-center gap-1"
            title="Auto-distribute milestones evenly"
          >
            <RefreshCw size={11} /> Auto-Split
          </button>
        </div>
      </div>

      {/* Payment Milestones Table */}
      <div className="space-y-2.5">
        {paymentRows.map((row, idx) => (
          <div
            key={row.id || idx}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-[#091b36] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {idx + 1}
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={row.description}
                onChange={(e) => handleRowDescChange(idx, e.target.value)}
                className="w-full text-xs font-medium text-slate-700 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-[#1a5ba5] focus:outline-none py-1 transition-colors"
                placeholder="Milestone description..."
              />
            </div>

            <div className="w-32 relative shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
              <input
                type="text"
                value={row.amount || ''}
                onChange={(e) => handleRowAmountChange(idx, e.target.value)}
                className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-[#1a5ba5]"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Statutory Payment Terms Note */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-slate-800">California Statutory Payment Terms:</div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Invoices are payable upon milestone completion. Unconditional statutory lien releases (pursuant to California
          Civil Code §§ 8400 &amp; 8404) will be provided for all completed and paid progress stages.
        </p>
      </div>
    </div>
  );
}

export default ContractPaymentScheduleStep;
