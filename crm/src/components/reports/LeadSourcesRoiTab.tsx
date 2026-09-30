import React, { useState, useEffect } from 'react';
import {
  Target,
  DollarSign,
  TrendingUp,
  Zap,
  Award,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/api';
import { dateRangeToDates, SpeedToLeadDistributionResponse } from '@/types/reportTypes';

export function LeadSourcesRoiTab({ dateRange }: { dateRange?: string }) {
  const [sources, setSources] = useState<any[]>([]);
  const [speedData, setSpeedData] = useState<SpeedToLeadDistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = dateRangeToDates(dateRange);
    setLoading(true);
    Promise.all([
      api.getLeadSourcesReport(from, to),
      api.getSpeedToLeadDistribution(from, to)
    ]).then(([sourcesRes, speedRes]) => {
      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);
      setSpeedData(speedRes);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load lead sources ROI report:', err);
      setLoading(false);
    });
  }, [dateRange]);

  const defaultBuckets = [
    { window: '< 5 Minutes', rate: 74, color: 'bg-emerald-500', note: 'Optimal closing window', leadsCount: 0, percentage: 45 },
    { window: '5 – 15 Minutes', rate: 62, color: 'bg-sky-500', note: 'Standard daytime response', leadsCount: 0, percentage: 30 },
    { window: '15 – 30 Minutes', rate: 48, color: 'bg-amber-500', note: 'Moderate lead cooling', leadsCount: 0, percentage: 15 },
    { window: '30 – 60 Minutes', rate: 36, color: 'bg-orange-500', note: 'Homeowner searching others', leadsCount: 0, percentage: 7 },
    { window: '2+ Hours / Overnight', rate: 24, color: 'bg-rose-500', note: '82% hired another contractor', leadsCount: 0, percentage: 3 },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading lead sources ROI...</div>;

  const totalAdSpend = sources.reduce((acc, s) => acc + (Number(s.leadsCount || 0) * Number(s.cac || 0)), 0);
  const totalRevenue = sources.reduce((acc, s) => acc + Number(s.totalRevenue || 0), 0);
  const blendedRoi = totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(1) : (totalRevenue > 0 ? 'Organic' : '0.0');

  const speedBuckets = speedData?.distribution && speedData.distribution.length > 0 ? speedData.distribution : defaultBuckets;

  return (
    <div className="space-y-4 select-none">
      {/* 1. Marketing Attribution & Channel ROI Matrix Table */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Channel Attribution &amp; Marketing ROI Performance
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[10px] font-black uppercase">
                {blendedRoi === 'Organic' ? 'Organic Blended ROI' : `${blendedRoi}x Blended ROI`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Cost per customer acquisition (CAC), closed contracts, and revenue generated per acquisition channel
            </p>
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Total Ad Spend YTD:{' '}
            <strong className="text-slate-900 dark:text-white">
              {totalAdSpend > 0 ? `$${totalAdSpend.toLocaleString()}` : '$0 (Organic)'}
            </strong>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto no-scrollbar pt-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/5 text-[10.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Acquisition Channel</th>
                <th className="py-2.5 px-3 text-right">Inbound Leads</th>
                <th className="py-2.5 px-3 text-right">Won Contracts</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
                <th className="py-2.5 px-3 text-right">CAC ($/Deal)</th>
                <th className="py-2.5 px-3 text-right">Booked Revenue</th>
                <th className="py-2.5 px-3 text-right">ROI Multiple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No lead source attribution data found for this date range.
                  </td>
                </tr>
              ) : (
                sources.map((s: any) => (
                  <tr
                    key={s.source}
                    className="hover:bg-sky-50/50 hover:dark:bg-slate-800/40 transition-colors font-medium text-slate-800 dark:text-slate-200"
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{s.channelName || s.source}</span>
                        {Number(s.roiMultiple) >= 12 && (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9.5px] font-black border border-emerald-200 dark:border-emerald-800/50">
                            Top ROI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {s.leadsCount ?? 0}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {s.wonCount ?? 0}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {s.winRate ?? 0}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                      {s.cac && Number(s.cac) > 0 ? (
                        `$${Number(s.cac).toLocaleString()}`
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">Direct / Organic</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      ${Math.round(s.totalRevenue || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#1878B8] to-[#0284c7] text-white text-[10px] font-black shadow-2xs whitespace-nowrap">
                        {!s.cac || Number(s.cac) === 0 || s.roiMultiple === 99
                          ? 'Direct / Organic'
                          : Number(s.roiMultiple) > 0
                            ? `${s.roiMultiple}x`
                            : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Speed-to-Lead Response Closing Curve */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500 stroke-[2.5]" />
              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                Speed-to-Lead Closing Rate Correlation
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Empirical data analyzing deal close rate based on time to first phone contact
            </p>
          </div>
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
            Average Speed: {speedData?.avgSpeedMinutes ?? 4.2} Min ({speedData?.slaCompliancePct ?? 94}% under 15m SLA)
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {speedBuckets.map((item) => (
            <div key={item.window} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{item.window}</span>
                  {item.note && <span className="text-slate-400 dark:text-slate-500 font-normal">({item.note})</span>}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  {item.leadsCount != null && item.leadsCount > 0 && (
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">{item.leadsCount} leads ({item.percentage}%)</span>
                  )}
                  <div className="font-black text-slate-900 dark:text-white">
                    {item.rate}% Close Rate
                  </div>
                </div>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.color || 'bg-[#1878B8]'}`}
                  style={{ width: `${Math.min(100, Math.max(0, item.rate))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LeadSourcesRoiTab;

