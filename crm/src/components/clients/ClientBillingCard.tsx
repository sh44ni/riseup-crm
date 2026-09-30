import React from 'react';
import { DollarSign, CheckCircle2, AlertCircle, ExternalLink, ChevronRight } from 'lucide-react';
import { BillingSummary } from '@/types/client360Types';

interface ClientBillingCardProps {
  billing: BillingSummary;
  onViewAll?: () => void;
  onOpenHub?: () => void;
}

export function ClientBillingCard({ billing, onViewAll, onOpenHub }: ClientBillingCardProps) {
  return (
    <div className="light-glass-card rounded-2xl p-5 flex flex-col justify-between">
      <div>
        {/* Header matching mockup */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              $
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Billing & Cash Flow</h3>
          </div>

          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-[#0284C7] dark:text-sky-400 hover:text-[#0369a1] dark:hover:text-sky-300 transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 2 KPI Stat Boxes (Exact Mockup Layout) */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-white/10">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Billed</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              ${billing.totalBilled.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-500/20">
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Collected Cash</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              ${billing.collectedCash.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Payment Health Status Banner (Exact Mockup) */}
        <div className="mt-4">
          {billing.paymentHealthStatus === 'current_and_paid' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{billing.paymentHealthMessage || 'All invoices current & paid in full'}</span>
            </div>
          )}

          {billing.paymentHealthStatus === 'deposit_pending' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{billing.paymentHealthMessage || `$${billing.pendingDeposit.toLocaleString()} Deposit Invoice Due`}</span>
            </div>
          )}

          {billing.paymentHealthStatus === 'no_billing_archived' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
              <span>{billing.paymentHealthMessage || 'No active billings • Deal archived'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer matching mockup */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Invoices on file: {billing.invoicesOnFileCount || billing.invoices?.length || 0}</span>
        <button
          onClick={onOpenHub}
          className="text-[#0284C7] dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>Open Invoices Hub</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
