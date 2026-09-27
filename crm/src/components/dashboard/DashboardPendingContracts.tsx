import React from 'react';
import { Link } from 'react-router-dom';
import { PenTool, ChevronRight } from 'lucide-react';
import { ContractRow } from '@/api/contractApi';

export interface DashboardPendingContractsProps {
  pendingContracts: ContractRow[];
  onSelectContract: (c: ContractRow) => void;
}

export function DashboardPendingContracts({
  pendingContracts,
  onSelectContract,
}: DashboardPendingContractsProps) {
  if (pendingContracts.length === 0) return null;

  return (
    <div className="rounded-2xl p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-emerald-500/5 border border-amber-500/30 dark:border-amber-400/25 shadow-md backdrop-blur-md relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2.5 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-xs shadow-amber-500/30 shrink-0 animate-pulse">
            <PenTool size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Action Required: Contracts Awaiting Company Counter-Signature
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                {pendingContracts.length} Pending
              </span>
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-300">
              Homeowners have electronically signed &amp; initialed their contracts. Counter-sign to execute, email final PDFs, and send SMS download links.
            </p>
          </div>
        </div>
        <Link
          to="/contracts?status=client_signed"
          className="text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 flex items-center gap-1 transition-colors"
        >
          <span>View In Contracts Access Panel</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Pending contracts grid */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {pendingContracts.map((c) => (
          <div
            key={c.id}
            className="bg-white/85 dark:bg-slate-900/85 rounded-xl p-3 border border-amber-200/90 dark:border-amber-900/40 shadow-xs flex items-center justify-between gap-3 group hover:border-amber-400 transition-all"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                  {c.contract_number}
                </span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  Client Signed
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {c.customer_name || 'Homeowner'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {c.estimated_value ? `$${Number(c.estimated_value).toLocaleString()}` : '$—'}
                </span>
                <span>&bull;</span>
                <span className="truncate">{c.customer_city || c.customer_address || 'CA'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectContract(c)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer animate-pulse hover:animate-none"
              title="Counter-Sign & Execute Contract"
            >
              <PenTool size={12} className="stroke-[2.5]" />
              <span>Counter-Sign</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
