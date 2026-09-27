import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { Calendar, DollarSign, ShieldAlert, Clock } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractDatesPricingStep({ data, onDataChange }: StepProps) {
  const handlePriceChange = (valStr: string) => {
    const raw = parseFloat(valStr.replace(/[^0-9.]/g, '')) || 0;
    // Auto-calculate CSLB compliant downpayment
    const dp = Math.min(1000, Math.round(raw * 0.1));
    const rem = Math.max(0, raw - dp);
    const p1 = Math.round(rem * 0.3);
    const p2 = Math.round(rem * 0.3);
    const p3 = Math.max(0, raw - dp - p1 - p2);

    onDataChange({
      contractPrice: raw,
      downpayment: dp,
      paymentSchedule: [
        { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
        { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
        { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
        { id: '4', number: '4.', description: 'Final Payment (Installation complete & walkthrough)', amount: p3 },
      ],
    });
  };

  const handleDownpaymentChange = (valStr: string) => {
    const raw = parseFloat(valStr.replace(/[^0-9.]/g, '')) || 0;
    const maxAllowed = Math.min(1000, Math.round(data.contractPrice * 0.1));
    const capped = Math.min(raw, maxAllowed);
    onDataChange({ downpayment: capped });
  };

  return (
    <div className="space-y-6">
      {/* 1. California Statutory Milestones */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Clock size={16} className="text-[#1a5ba5]" /> Project Milestones &amp; Timetable
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Approx. Start Date
            </label>
            <input
              type="text"
              value={data.approxStartDate}
              onChange={(e) => onDataChange({ approxStartDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
              placeholder="Within 2–3 weeks of permit"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Substantial Commencement
            </label>
            <input
              type="text"
              value={data.substantialCommencementDate}
              onChange={(e) => onDataChange({ substantialCommencementDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
              placeholder="Within 3 days of delivery"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Approx. Completion
            </label>
            <input
              type="text"
              value={data.approxCompletionDate}
              onChange={(e) => onDataChange({ approxCompletionDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
              placeholder="5–7 days from commencement"
            />
          </div>
        </div>
      </div>

      {/* 2. Total Contract Price & CSLB Downpayment */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <DollarSign size={16} className="text-[#1a5ba5]" /> Contract Pricing &amp; Downpayment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Total Contract Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="text"
                value={data.contractPrice || ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="31000"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Initial Downpayment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="text"
                value={data.downpayment || ''}
                onChange={(e) => handleDownpaymentChange(e.target.value)}
                placeholder="1000"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* California CSLB Downpayment Alert */}
        <div className="p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-xl flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#1a5ba5] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-[#091b36] block mb-0.5">
              California CSLB Downpayment Statutory Cap:
            </span>
            Under California Business and Professions Code § 7159, the downpayment may not exceed{' '}
            <strong className="text-slate-800 font-bold">$1,000 or 10% of the contract price</strong>, whichever is less.
          </div>
        </div>

        {/* Finance Charge */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Finance Charge (If Applicable)
          </label>
          <input
            type="text"
            value={data.financeCharge}
            onChange={(e) => onDataChange({ financeCharge: e.target.value })}
            placeholder="N/A"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

export default ContractDatesPricingStep;
