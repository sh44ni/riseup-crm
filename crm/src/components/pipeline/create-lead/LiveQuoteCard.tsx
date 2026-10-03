import React from 'react';
import { Calculator } from 'lucide-react';
import type { LiveQuoteResult } from './quoteMath';

interface LiveQuoteCardProps {
  quote: LiveQuoteResult;
}

export function LiveQuoteCard({ quote }: LiveQuoteCardProps) {
  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-white dark:from-sky-950/40 dark:via-sky-950/20 dark:to-slate-900/60 border border-sky-200/90 dark:border-sky-500/30 shadow-2xs flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Calculator size={13} className="text-brand-600 dark:text-sky-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Live Formula Deal Valuation
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          {quote.midpoint != null ? (
            <>
              <span className="text-lg font-black text-brand-600 dark:text-sky-400">
                ${quote.midpoint.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                (${quote.low?.toLocaleString()} – ${quote.high?.toLocaleString()})
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">
              Add roof size to estimate value
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {quote.monthly != null ? (
          <>
            <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-200/80 dark:border-sky-500/40">
              ~${quote.monthly}/mo
            </span>
            <span className="block text-[9.5px] text-slate-400 mt-0.5">
              {quote.term}-mo term
            </span>
          </>
        ) : (
          <span className="text-[10px] text-slate-400">Estimate Pending</span>
        )}
      </div>
    </div>
  );
}
