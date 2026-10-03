import React from 'react';
import { FileText, Clock, User, MapPin } from 'lucide-react';
import { ContractStudioData } from '@/types/contractStudioTypes';

interface ContractSummaryOverviewProps {
  data: ContractStudioData;
}

export function ContractSummaryOverview({ data }: ContractSummaryOverviewProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FileText size={16} className="text-[#1a5ba5]" />
          Contract Summary &amp; Overview
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <Clock size={12} /> CSLB Compliant &bull; 6 Pages
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Client
            </div>
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <User size={13} className="text-slate-400" /> {data.clientName || 'Not selected'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{data.clientPhone || 'No phone'}</div>
            <div className="text-xs text-slate-500">{data.clientEmail || 'No email'}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Property Address
            </div>
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" /> {data.projectAddress || 'Not entered'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {data.city ? `${data.city}, ${data.state || 'CA'} ${data.zip || ''}` : '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Contract Total</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              ${(data.contractPrice || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Downpayment</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">
              ${(data.downpayment || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Milestones</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {data.paymentSchedule?.length || 0} Payments
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
