import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { ShieldCheck, Mail, FileCheck } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractTermsStep({ data, onDataChange }: StepProps) {
  return (
    <div className="space-y-8">
      {/* Licensing & Statutory */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Licensing &amp; California CSLB Disclosures
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Contractor License #
            </label>
            <input
              type="text"
              value={data.contractorLicense}
              onChange={(e) => onDataChange({ contractorLicense: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Cancellation Notice Email
            </label>
            <input
              type="email"
              value={data.cancellationEmail}
              onChange={(e) => onDataChange({ cancellationEmail: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>
        </div>
      </div>

      {/* Insurance Coverage */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Insurance Coverage Disclosures
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              General Liability Carrier
            </label>
            <input
              type="text"
              value={data.insuranceCarrier}
              onChange={(e) => onDataChange({ insuranceCarrier: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Carrier Agent Phone
            </label>
            <input
              type="text"
              value={data.insurancePhone}
              onChange={(e) => onDataChange({ insurancePhone: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Workers' Compensation Insurance
            </label>
            <input
              type="text"
              value={data.workersCompCarrier}
              onChange={(e) => onDataChange({ workersCompCarrier: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>
        </div>
      </div>

      {/* Execution & Signatories */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Signatories &amp; Execution Placeholders
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Contractor Signatory Name
            </label>
            <input
              type="text"
              value={data.contractorSignatureName || ''}
              onChange={(e) => onDataChange({ contractorSignatureName: e.target.value })}
              placeholder="e.g. Authorized Signatory Name"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Client Signatory Name
            </label>
            <input
              type="text"
              value={data.clientSignatureName || ''}
              onChange={(e) => onDataChange({ clientSignatureName: e.target.value })}
              placeholder="e.g. Client Signatory Name"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Client Initials (Rendered in preview)
            </label>
            <input
              type="text"
              value={data.clientInitials || ''}
              onChange={(e) => onDataChange({ clientInitials: e.target.value })}
              placeholder="Initials"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractTermsStep;
