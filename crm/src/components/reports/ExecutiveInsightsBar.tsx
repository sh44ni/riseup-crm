import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { EXECUTIVE_INSIGHTS } from '@/data/reportData';
import { dateRangeToDates, ExecutiveInsight } from '@/types/reportTypes';

export function ExecutiveInsightsBar({ dateRange }: { dateRange?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [insights, setInsights] = useState<ExecutiveInsight[]>(EXECUTIVE_INSIGHTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const { from, to } = dateRangeToDates(dateRange);
    setLoading(true);

    api.getExecutiveInsights(from, to)
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res) && res.length > 0) {
          setInsights(res);
        } else {
          setInsights(EXECUTIVE_INSIGHTS);
        }
      })
      .catch((err) => {
        console.error('Failed to load executive insights:', err);
        if (isMounted) setInsights(EXECUTIVE_INSIGHTS);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  const count = insights.length;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-sky-50/90 via-white/95 to-amber-50/90 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-900/90 light-glass-panel border border-white/95 dark:border-white/10 shadow-sm p-4 sm:p-5 select-none space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1878B8] to-[#0284c7] text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={18} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                AI Executive Intelligence &amp; Profit Recommendations
              </span>
              {loading ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/60 text-[9.5px] font-black uppercase animate-pulse">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Analyzing...</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 text-[9.5px] font-black uppercase">
                  {count} Key {count === 1 ? 'Opportunity' : 'Opportunities'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Automated algorithmic analysis of pricing margins, territory economics, and response SLAs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 hover:dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>{isExpanded ? 'Hide Details' : 'Review Insights'}</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/10 animate-in fade-in slide-in-from-top-1 duration-200">
          {insights.map((ins, idx) => (
            <div
              key={ins.id || idx}
              className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {ins.category}
                </span>
                <span className={`text-[10.5px] font-bold font-mono ${
                  ins.type === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {ins.impact}
                </span>
              </div>
              <h5 className="font-black text-xs text-slate-900 dark:text-white leading-snug">
                {ins.title}
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {ins.recommendation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExecutiveInsightsBar;

