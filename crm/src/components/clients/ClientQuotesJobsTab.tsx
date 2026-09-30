import React from 'react';
import { FileText, CheckCircle2, XCircle, Clock, DollarSign, Download, Eye, Layers } from 'lucide-react';
import { Client360Record } from '@/types/client360Types';

interface ClientQuotesJobsTabProps {
  client: Client360Record;
}

export function ClientQuotesJobsTab({ client }: ClientQuotesJobsTabProps) {
  const { quotes, activeJob, completedJob, lossPostMortem } = client;

  return (
    <div className="space-y-6">
      {/* Active or Completed Job Summary */}
      {(activeJob || completedJob || lossPostMortem) && (
        <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[#0284C7] dark:text-sky-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Project Master Scope & Specs</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Address: {client.roofSpecs.address}, {client.roofSpecs.cityZip}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Specified Material</span>
              <div className="font-bold text-slate-900 dark:text-white text-sm">{client.roofSpecs.roofMaterial}</div>
              <div className="text-slate-400 dark:text-slate-500">Pitch {client.roofSpecs.pitch || '4/12'} • {client.roofSpecs.roofSquares} Squares</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Contract / Estimated Value</span>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                ${(activeJob?.contractValue || completedJob?.totalPaid || lossPostMortem?.proposedValue || 0).toLocaleString()}
              </div>
              <div className="text-slate-400 dark:text-slate-500">Assigned: {client.assignedRep.name}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Project Status</span>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {activeJob?.stage || (completedJob ? 'Completed & Warrantied' : 'Closed Lost Archive')}
              </div>
              <div className="text-slate-400 dark:text-slate-500">Lead: {activeJob?.crewLead || 'Rise Up Certified Crew'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Estimates & Proposals List */}
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#0284C7] dark:text-sky-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Estimates & Quotes on File</h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {quotes.length} proposal{quotes.length === 1 ? '' : 's'}
          </span>
        </div>

        {quotes.map((quote) => (
          <div key={quote.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{quote.quoteNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      quote.status === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : quote.status === 'declined'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                        : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                    }`}
                  >
                    {quote.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{quote.title} • Date: {quote.date}</div>
              </div>

              <div className="text-right">
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">${quote.amount.toLocaleString()}</div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Full System Scope</span>
              </div>
            </div>

            {/* Optional Tier options breakdown if present */}
            {quote.tierOptions && quote.tierOptions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Presented Options & Tiers:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  {quote.tierOptions.map((tier, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs ${
                        tier.selected
                          ? 'bg-[#0284C7]/5 dark:bg-sky-950/30 border-[#0284C7]/40 dark:border-sky-500/40 text-[#0284C7] dark:text-sky-400 font-semibold'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{tier.name}</span>
                        {tier.selected && <CheckCircle2 size={13} className="text-[#0284C7] dark:text-sky-400 shrink-0" />}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white mt-1">${tier.price.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
