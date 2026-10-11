import React from 'react';
import { AlertCircle, PenTool, ShieldCheck } from 'lucide-react';
import { DEFAULT_SIGNER_NAME } from './signatureFormat';

interface CompanySignatureEmptyStateProps {
  canEdit: boolean;
  onSetUp: () => void;
}

export function CompanySignatureEmptyState({ canEdit, onSetUp }: CompanySignatureEmptyStateProps) {
  return (
    <div className="light-glass-card bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm backdrop-blur-md">
      <div className="py-10 px-6 text-center max-w-lg mx-auto space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
          <AlertCircle size={28} />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Company signature not set up</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Rise Up uses one contractor signature ({DEFAULT_SIGNER_NAME}) on every contract. Until it is set up,
            contracts can’t be sent to customers or counter-signed.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-xs text-left text-slate-600 dark:text-slate-300 space-y-2">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-purple-600" />
            How it works
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400 pl-1">
            <li>The signer’s name and title are printed on every contract.</li>
            <li>Team members with “Can use” access apply it when they counter-sign.</li>
            <li>Every change is logged with who made it, when and why.</li>
          </ul>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={onSetUp}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-purple-500/25 transition-all cursor-pointer"
          >
            <PenTool size={15} />
            <span>Set up signature</span>
          </button>
        ) : (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Not set up yet — ask someone with Edit access.
          </p>
        )}
      </div>
    </div>
  );
}
