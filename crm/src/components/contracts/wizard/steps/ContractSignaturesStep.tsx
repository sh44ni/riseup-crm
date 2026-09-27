import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { PenTool, CheckCircle, ShieldAlert } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractSignaturesStep({ data, onDataChange }: StepProps) {
  return (
    <div className="space-y-6">
      {/* 1. Agreement Execution */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <PenTool size={16} className="text-[#1a5ba5]" /> Execution of Agreement Signatures
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Contractor Authorized Signer
            </span>
            <input
              type="text"
              value={data.contractorName}
              onChange={(e) => onDataChange({ contractorName: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
              placeholder="Authorized Contractor Representative"
            />
            <div className="text-[11px] text-slate-500">
              Title: <span className="font-semibold text-slate-700">{data.contractorTitle || 'Project Manager'}</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Client Signer Name
            </span>
            <input
              type="text"
              value={data.clientName}
              onChange={(e) => onDataChange({ clientName: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
              placeholder="Client Full Name"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Client Initials:</span>
              <input
                type="text"
                maxLength={4}
                value={data.clientInitials}
                onChange={(e) => onDataChange({ clientInitials: e.target.value.toUpperCase() })}
                className="w-16 px-2 py-0.5 text-center font-bold text-xs bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
                placeholder="Initials"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. California Right to Cancel Addendum */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldAlert size={16} className="text-[#1a5ba5]" /> Right to Cancel Addendum
        </h3>

        <div className="space-y-3">
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <div className="flex items-start gap-2">
              <CheckCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-amber-900 block mb-0.5">Three-Day Right to Cancel</span>
                The law requires that the contractor give you a notice explaining your right to cancel. Initialed by client for legal execution.
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <div className="flex items-start gap-2">
              <CheckCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-amber-900 block mb-0.5">Five-Day Right to Cancel (Senior Citizens, age 65+)</span>
                California law extends cancellation rights to five business days for clients aged 65 or older. Included automatically on Page 4 and Page 6.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractSignaturesStep;
