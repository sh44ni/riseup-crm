import React from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

interface ContractPdfActionsProps {
  isDownloading: boolean;
  isSigned: boolean;
  onDownloadBlank: () => void;
  onDownloadSigned: () => void;
}

export function ContractPdfActions({
  isDownloading,
  isSigned,
  onDownloadBlank,
  onDownloadSigned,
}: ContractPdfActionsProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <Download size={16} className="text-[#1a5ba5]" />
          PDF Documents
        </div>
        <span className="text-xs text-slate-400">Playwright High-Res PDF</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          onClick={onDownloadBlank}
          disabled={isDownloading}
          className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-slate-300"
        >
          <Download size={15} />
          <span>{isDownloading ? 'Compiling PDF...' : 'Download Blank Contract (PDF)'}</span>
        </button>

        {isSigned ? (
          <button
            onClick={onDownloadSigned}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <CheckCircle2 size={15} />
            <span>Download Signed Contract (PDF)</span>
          </button>
        ) : (
          <div className="py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 text-center">
            Signed PDF generates once client completes signing
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        * Blank contract is generated with clean, empty lines and boxes ready for manual or electronic execution.
      </p>
    </div>
  );
}
