import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { PublicContractData } from '@/types/contractStudioTypes';

export interface Step5SignedConfirmationProps {
  contract: PublicContractData;
  signedPdfUrl: string | null;
  signedAtDate: string | null;
  onDownloadPdf: (url: string | null) => void;
}

export function Step5SignedConfirmation({
  contract,
  signedPdfUrl,
  signedAtDate,
  onDownloadPdf,
}: Step5SignedConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 text-center py-6">
      <div className="bg-white border-2 border-emerald-200 rounded-3xl p-8 sm:p-10 shadow-lg space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={44} strokeWidth={2.5} />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Contract Signed Successfully!</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Thank you, <strong>{contract.clientName}</strong>. Your Home Improvement Contract has been executed and verified. Our production coordinator will contact you to finalize material staging and start dates.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 text-left">
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">Contract Reference:</span>
            <span className="font-bold text-slate-800">{contract.contractNumber}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">Project Address:</span>
            <span className="font-bold text-slate-800">{contract.projectAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date Executed:</span>
            <span className="font-bold text-emerald-700">{signedAtDate || 'Today'}</span>
          </div>
        </div>

        {signedPdfUrl && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onDownloadPdf(signedPdfUrl)}
              className="w-full py-4 px-6 bg-[#1a5ba5] hover:bg-[#154a87] text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-xl transition-all cursor-pointer"
            >
              <Download size={20} />
              <span>Download Your Signed Contract (PDF)</span>
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Official 6-page California Home Improvement Contract with your electronic signature &amp; initials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
