import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { ShieldCheck, Mail, FileText, AlertTriangle, Info } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractTermsStep({ data, onDataChange }: StepProps) {
  return (
    <div className="space-y-6">
      {/* 1. Insurance Disclosures */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldCheck size={16} className="text-[#1a5ba5]" /> Insurance Coverage Clauses
        </h3>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              C. Commercial General Liability Insurance
            </label>
            <textarea
              rows={3}
              value={data.liabilityInsuranceText}
              onChange={(e) => onDataChange({ liabilityInsuranceText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              D. Workers’ Compensation Insurance
            </label>
            <textarea
              rows={3}
              value={data.workersCompText}
              onChange={(e) => onDataChange({ workersCompText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 2. Mechanics Lien Warning (Statutory) */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" /> E. Mechanics Lien Warning
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            California Statutory
          </span>
        </div>

        <textarea
          rows={6}
          value={data.mechanicsLienWarningText}
          onChange={(e) => onDataChange({ mechanicsLienWarningText: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
        />

        <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800">
          <Info size={15} className="text-sky-600 mt-0.5 shrink-0" />
          <span>
            <b>Client Initial Box:</b> Positioned below the Mechanics Lien Warning on Page 4. Stays empty in the draft and populates when the client initials in the portal.
          </span>
        </div>
      </div>

      {/* 3. CSLB Disclosure */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText size={16} className="text-[#1a5ba5]" /> F. Contractors’ State License Board (CSLB) Disclosure
        </h3>

        <textarea
          rows={4}
          value={data.cslbDisclosureText}
          onChange={(e) => onDataChange({ cslbDisclosureText: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
        />
      </div>
    </div>
  );
}

export default ContractTermsStep;
