import React from 'react';
import { Archive, FileCheck2, FileSignature, Send, FilePen } from 'lucide-react';
import { ContractRow } from '@/api/contractApi';

interface ContractStatusBadgeProps {
  contract: ContractRow;
}

export function ContractStatusBadge({ contract }: ContractStatusBadgeProps) {
  if (contract.is_archived) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10">
        <Archive size={11} className="shrink-0 text-slate-500" />
        <span>Archived</span>
      </span>
    );
  }
  switch (contract.status.toLowerCase()) {
    case 'signed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <FileCheck2 size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Fully Executed</span>
        </span>
      );
    case 'client_signed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
          <FileSignature size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Partially Executed</span>
        </span>
      );
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
          <Send size={12} className="shrink-0 text-sky-600 dark:text-sky-400" />
          <span>Sent — Awaiting Signature</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10">
          <FilePen size={12} className="shrink-0 text-slate-500" />
          <span>Drafted</span>
        </span>
      );
  }
}
