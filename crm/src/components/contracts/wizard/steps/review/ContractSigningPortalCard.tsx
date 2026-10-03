import React from 'react';
import { ShieldCheck, RefreshCw, Check, Copy, ExternalLink } from 'lucide-react';

interface ContractSigningPortalCardProps {
  isGeneratingLink: boolean;
  activeSigningLink: string;
  copiedLink: boolean;
  linkError: string | null;
  onCopyLink: () => void;
  onOpenWizard: () => void;
  onRetryLink: () => void;
}

export function ContractSigningPortalCard({
  isGeneratingLink,
  activeSigningLink,
  copiedLink,
  linkError,
  onCopyLink,
  onOpenWizard,
  onRetryLink,
}: ContractSigningPortalCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1a5ba5]">
            <ShieldCheck size={18} />
            Interactive Client Signing Portal
          </div>
          <p className="text-xs text-slate-600 max-w-xl">
            Clients access this mobile-friendly, branded wizard to review contract terms, initial
            required statutory clauses, and draw or type their legal signature.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-300">
          Self-Service Wizard
        </span>
      </div>

      <div className="bg-white border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200/60">
          {isGeneratingLink ? (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-2 animate-pulse py-1">
              <RefreshCw size={13} className="animate-spin text-blue-600" />
              Generating secure homeowner signing link...
            </span>
          ) : (
            <input
              type="text"
              readOnly
              value={activeSigningLink || 'Click Copy or Open to generate link...'}
              className="w-full bg-transparent border-none text-xs text-slate-700 font-mono focus:outline-none select-all truncate"
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCopyLink}
            disabled={isGeneratingLink}
            className="px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {copiedLink ? (
              <>
                <Check size={13} strokeWidth={3} /> Copied!
              </>
            ) : (
              <>
                <Copy size={13} /> Copy Link
              </>
            )}
          </button>
          {activeSigningLink ? (
            <a
              href={activeSigningLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ExternalLink size={13} /> Open Wizard
            </a>
          ) : (
            <button
              onClick={onOpenWizard}
              disabled={isGeneratingLink}
              className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <ExternalLink size={13} /> Open Wizard
            </button>
          )}
        </div>
      </div>

      {linkError && (
        <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 animate-in fade-in">
          <span className="font-medium">Notice: {linkError}</span>
          <button
            type="button"
            onClick={onRetryLink}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Retry Generation
          </button>
        </div>
      )}
    </div>
  );
}
