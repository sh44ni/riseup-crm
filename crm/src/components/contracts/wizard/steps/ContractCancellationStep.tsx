import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { Mail, MapPin, Calendar, FileText, Info } from 'lucide-react';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractCancellationStep({ data, onDataChange }: StepProps) {
  return (
    <div className="space-y-6">
      {/* 1. Cancellation Delivery Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Mail size={16} className="text-[#1a5ba5]" /> Notice Delivery &amp; Contact Info
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Cancellation Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={data.cancellationEmail}
                onChange={(e) => onDataChange({ cancellationEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
                placeholder="accountant@riseuprac.com"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Listed on masthead and in both Exhibit A detachable cancellation forms.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Business Physical Address
            </label>
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
              2182 S El Camino Real, Suite 202, Oceanside, CA 92054
            </div>
            <p className="text-[10px] text-slate-400">
              Headquarters location where certified cancellation mail may be delivered.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Statutory Forms Overview */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <FileText size={16} className="text-[#1a5ba5]" /> Statutory Notice &amp; Detachable Forms
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Calendar size={14} className="text-[#1a5ba5]" />
              Page 5: Three-Day Cancellation
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Standard 3 business day cancellation disclosure with client receipt acknowledgment and detachable Exhibit A mail/email form.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Calendar size={14} className="text-amber-600" />
              Page 6: Five-Day Cancellation (65+)
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              California statutory 5 business day protection for seniors aged 65 and older with detachable Exhibit A (2) form.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Info size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <span>
            If the client cancels, any payments made must be refunded within 10 days of notice receipt pursuant to California Civil Code.
          </span>
        </div>
      </div>
    </div>
  );
}

export default ContractCancellationStep;
