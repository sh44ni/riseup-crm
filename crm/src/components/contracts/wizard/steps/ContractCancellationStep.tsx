import React from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { Mail, Calendar, FileText, Info } from 'lucide-react';

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
            <input
              type="email"
              value={data.cancellationEmail || 'accountant@riseuprac.com'}
              onChange={(e) => onDataChange({ cancellationEmail: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
              placeholder="accountant@riseuprac.com"
            />
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

      {/* 2. Statutory Three-Day & Five-Day Notices */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText size={16} className="text-[#1a5ba5]" /> Cancellation Statutory Notice Text
        </h3>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-[#1a5ba5]" /> Page 6: Three-Day Cancellation Rights (§ 1689.7)
            </label>
            <textarea
              rows={4}
              value={data.threeDayNoticeText}
              onChange={(e) => onDataChange({ threeDayNoticeText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-600" /> Page 7: Five-Day Cancellation Rights for Seniors 65+ (§ 1689.14(a))
            </label>
            <textarea
              rows={4}
              value={data.fiveDayNoticeText}
              onChange={(e) => onDataChange({ fiveDayNoticeText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1a5ba5] transition-colors leading-relaxed"
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <Info size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <span>
          <b>Exhibit A &amp; A (2) Detachable Forms:</b> Both Page 6 and Page 7 include detachable statutory forms for client records. When signed via the portal, client details and notice dates are automatically synchronized.
        </span>
      </div>
    </div>
  );
}

export default ContractCancellationStep;
