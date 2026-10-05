import React from 'react';
import { ContractStudioData, ContractPaymentRow } from '@/types/contractStudioTypes';
import { CreditCard, Plus, Trash2, CheckCircle2, AlertTriangle, RefreshCw, FileText, Info } from 'lucide-react';

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

  const handleAddMilestone = () => {
    const newRow: ContractPaymentRow = {
      id: String(paymentRows.length + 1),
      number: `${paymentRows.length + 1}.`,
      description: 'Additional Milestone Phase',
      amount: 0,
    };
    onDataChange({ paymentSchedule: [...paymentRows, newRow] });
  };

  const handleRemoveMilestone = (index: number) => {
    const filtered = paymentRows.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      number: `${i + 1}.`,
    }));
    onDataChange({ paymentSchedule: filtered });
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
    <div className="space-y-6">
      {/* Header & Balance indicator */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CreditCard size={16} className="text-[#1a5ba5]" /> Progress Payment Milestones
          </h3>
          <p className="text-[11px] text-slate-400">
            Total milestone payments must sum exactly to the contract total.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isBalanced ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={12} className="text-emerald-600" />
              Balanced (${contractTotal.toLocaleString()})
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
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#1a5ba5] hover:bg-sky-50 border border-sky-200 transition-colors flex items-center gap-1 cursor-pointer"
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
            <div className="w-6 h-6 rounded-full bg-[#0b1a33] text-white flex items-center justify-center text-xs font-bold shrink-0">
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

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-bold text-slate-500">$</span>
              <input
                type="text"
                value={row.amount ? Number(row.amount).toLocaleString() : ''}
                onChange={(e) => handleRowAmountChange(idx, e.target.value)}
                className="w-24 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-[#1a5ba5]"
                placeholder="0"
              />
            </div>

            {paymentRows.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveMilestone(idx)}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                title="Remove milestone"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAddMilestone}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus size={13} /> Add Milestone Phase
          </button>
        </div>
      </div>

      {/* Note about Client Initial */}
      <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800">
        <Info size={15} className="text-sky-600 mt-0.5 shrink-0" />
        <span>
          <b>Client Initials:</b> The milestone initial box on Page 3 stays empty in the draft and will be filled automatically when the client initials via the client signing portal.
        </span>
      </div>

      {/* Payment Terms & Refund Policy Text */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <FileText size={15} className="text-[#1a5ba5]" /> Payment Terms &amp; Refund Policy Clauses
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Payment Terms, Invoicing Provisions &amp; Liens Release
          </label>
          <textarea
            rows={3}
            value={data.paymentTermsText}
            onChange={(e) => onDataChange({ paymentTermsText: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Refund Policy: 1.6.2(a) No Refunds Clause
          </label>
          <textarea
            rows={2}
            value={data.refundPolicyText}
            onChange={(e) => onDataChange({ refundPolicyText: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

export default ContractPaymentScheduleStep;
