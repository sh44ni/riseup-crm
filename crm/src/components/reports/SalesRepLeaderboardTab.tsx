import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { dateRangeToDates } from '@/types/reportTypes';

export function SalesRepLeaderboardTab({ dateRange }: { dateRange?: string }) {
  const [reps, setReps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = dateRangeToDates(dateRange);
    setLoading(true);
    api.getSalesRepReport(from, to).then(res => {
      setReps(Array.isArray(res) ? res : []);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load sales rep report:', err);
      setLoading(false);
    });
  }, [dateRange]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading sales rep leaderboard...</div>;

  return (
    <div className="space-y-4 select-none">
      {/* 1. Top Producers Podium Grid */}
      {reps.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          No sales representative performance data recorded for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {reps.map((rep, idx) => (
            <div
              key={rep.repId || idx}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3 relative group ${
                idx === 0
                  ? 'bg-gradient-to-b from-amber-50/70 to-white/90 dark:from-amber-950/30 dark:to-slate-900/80 border-amber-300 dark:border-amber-500/40 shadow-md ring-2 ring-amber-400/20'
                  : 'bg-white/80 dark:bg-slate-900/60 light-glass-panel border-white/90 dark:border-white/10 shadow-2xs hover:border-sky-300 dark:hover:border-sky-500/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${rep.avatarColor || 'from-[#1878B8] to-[#0284c7]'} text-white font-black text-xs flex items-center justify-center shadow-xs`}
                    >
                      {rep.initials || rep.name?.slice(0, 2).toUpperCase() || 'SR'}
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                        {rep.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize">
                        {rep.role}
                      </span>
                    </div>
                  </div>

                  {rep.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[9.5px] font-black shadow-2xs">
                      {rep.badge}
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-2 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Closed Volume</span>
                    <strong className="text-slate-900 dark:text-white font-black font-mono">
                      ${Math.round(rep.closedAmount || 0).toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Closing Win Rate</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {rep.winRate ?? 0}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Deals Won</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {rep.wonJobs ?? 0} {rep.wonJobs === 1 ? 'contract' : 'contracts'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Avg Deal Size</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                      ${Math.round(rep.avgTicket || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission Earned Bar */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Commission YTD</span>
                <strong className="text-[#0284c7] dark:text-sky-400 font-black font-mono">
                  ${Math.round(rep.commissionEarned || 0).toLocaleString()}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Detailed Performance Table */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Estimator Quota &amp; Pipeline Conversion Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Comparison of total dollar volume quoted against signed contracts and commissions
            </p>
          </div>
          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
            {reps.length} Active {reps.length === 1 ? 'Rep' : 'Reps'}
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 text-[10.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Estimator</th>
                <th className="py-2.5 px-3 text-right">Quoted Volume</th>
                <th className="py-2.5 px-3 text-right">Closed Volume</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Avg Ticket</th>
                <th className="py-2.5 px-3 text-right">Commission Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {reps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No active sales representatives found.
                  </td>
                </tr>
              ) : (
                reps.map((rep) => (
                  <tr
                    key={rep.repId}
                    className="hover:bg-sky-50/50 dark:hover:bg-white/5 transition-colors font-medium text-slate-800 dark:text-slate-200"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{rep.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">({rep.role})</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-500 dark:text-slate-400">
                      ${Math.round(rep.quotedAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      ${Math.round(rep.closedAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {rep.winRate ?? 0}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      ${Math.round(rep.avgTicket || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-[#1878B8] dark:text-sky-400">
                      ${Math.round(rep.commissionEarned || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SalesRepLeaderboardTab;

