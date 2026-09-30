import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Layers,
  Sparkles,
  BarChart,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/api';
import { dateRangeToDates } from '@/types/reportTypes';

export function RevenueVelocityTab({ dateRange }: { dateRange?: string }) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = dateRangeToDates(dateRange);
    setLoading(true);
    api.getRevenueReport(from, to).then(res => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load revenue velocity report:', err);
      setLoading(false);
    });
  }, [dateRange]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading revenue velocity...</div>;
  if (!data) return null;

  const monthlyData = data.monthly || [];
  const maxRevenue = Math.max(0, ...monthlyData.map((d: any) => d.revenue || 0));
  const materialSplits = data.materialSplits || [];

  const totalSquares = Number(data.totalSquares ?? materialSplits.reduce((acc: number, m: any) => acc + (Number(m.squaresCount) || 0), 0));
  const totalRevenue = Number(data.ytdTotal ?? materialSplits.reduce((acc: number, m: any) => acc + (Number(m.revenue) || 0), 0));
  const avgRevPerSq = Number(data.avgRevPerSq ?? (totalSquares > 0 ? Math.round(totalRevenue / totalSquares) : 0));
  const avgTicketSize = Number(data.avgTicket ?? 0);
  const bookedJobsCount = Number(data.bookedJobsCount ?? monthlyData.reduce((acc: number, d: any) => acc + (Number(d.bookedJobs) || 0), 0));
  const financingAdoptionPct = Number(data.financingAdoptionPct ?? 0);
  const avgMonthlyPayment = Number(data.avgMonthlyPayment ?? 0);

  const totalQuota = monthlyData.reduce((acc: number, d: any) => acc + (Number(d.target) || 0), 0);
  const totalBookedFromMonths = monthlyData.reduce((acc: number, d: any) => acc + (Number(d.revenue) || 0), 0);
  const actualRevForQuota = data.ytdTotal || totalBookedFromMonths;
  const quotaAttainment = totalQuota > 0 ? Math.round((actualRevForQuota / totalQuota) * 100) : (actualRevForQuota > 0 ? 100 : 0);

  return (
    <div className="space-y-4 select-none">
      {/* 1. Monthly Revenue Velocity vs Targets Chart */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Monthly Booked Revenue vs Target (2026)
              </h3>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${
                quotaAttainment >= 100
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                  : quotaAttainment >= 80
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
              }`}>
                {totalQuota > 0 ? `${quotaAttainment}% to Plan` : (actualRevForQuota > 0 ? 'Pacing Active' : '0% Quota Set')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Cumulative actual closed contract revenue compared against monthly sales quota
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <div className="w-3 h-3 rounded-md bg-gradient-to-tr from-[#1878B8] to-[#0284c7]" />
              <span>Actual Revenue</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <div className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700" />
              <span>Target Quota</span>
            </div>
          </div>
        </div>

        {/* SVG / Bar Chart Representation */}
        <div className="pt-4 pb-2">
          {monthlyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              No revenue data recorded for this period.
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-56 px-2">
              {monthlyData.map((d: any, idx: number) => {
                const actualHeightPct = maxRevenue > 0 ? Math.round((d.revenue / maxRevenue) * 100) : 0;
                const targetHeightPct = maxRevenue > 0 ? Math.round((d.target / maxRevenue) * 100) : 0;
                const isHovered = hoveredMonth === idx;

                return (
                  <div
                    key={d.month || idx}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 z-30 p-2 rounded-xl bg-slate-900 text-white text-[10px] shadow-xl border border-slate-700 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                        <div className="font-black">{d.month}</div>
                        <div className="text-emerald-400 font-bold">Revenue: ${Number(d.revenue || 0).toLocaleString()}</div>
                        <div className="text-slate-400">Quota: ${Number(d.target || 0).toLocaleString()} • {d.bookedJobs || 0} jobs</div>
                      </div>
                    )}

                    {/* Dual Bars: Actual (Front) & Target (Behind) */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full relative">
                      {/* Target Bar */}
                      <div
                        style={{ height: `${Math.max(4, targetHeightPct)}%` }}
                        className="w-1/2 rounded-t-lg bg-slate-200/80 dark:bg-slate-700/60 transition-all group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
                      />
                      {/* Actual Bar */}
                      <div
                        style={{ height: `${Math.max(4, actualHeightPct)}%` }}
                        className="w-1/2 rounded-t-lg bg-gradient-to-t from-[#1878B8] via-[#0284c7] to-[#38bdf8] transition-all group-hover:brightness-110 shadow-xs"
                      />
                    </div>

                    {/* Month Label */}
                    <div className="text-[11px] font-black text-slate-600 dark:text-slate-300 mt-2 font-mono">
                      {d.shortMonth || d.month}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                      ${Math.round((d.revenue || 0) / 1000)}k
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Material Revenue Split & Unit Economics (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left (7 Cols): Material Category Revenue Distribution */}
        <div className="lg:col-span-7 bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Revenue by Roofing System &amp; Material
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Breakdown of YTD contract value across shingle, tile, metal, and commercial TPO
              </p>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
              {totalSquares > 0 ? `${totalSquares.toLocaleString()} SQ Total` : '0 SQ Total'}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {materialSplits.map((mat: any) => (
              <div key={mat.category || mat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: mat.color || '#0284c7' }}
                    />
                    <span>{mat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{mat.squaresCount?.toLocaleString() || 0} SQ</span>
                    <strong className="text-slate-900 dark:text-white font-black">${Math.round(mat.revenue || 0).toLocaleString()}</strong>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {mat.percentage || 0}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, mat.percentage || 0))}%`,
                      backgroundColor: mat.color || '#0284c7',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (5 Cols): Unit Economics & Contract Metrics */}
        <div className="lg:col-span-5 bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-black text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-200/70 dark:border-white/10">
              Unit Economics &amp; Pricing Velocity
            </h4>

            <div className="space-y-3 pt-3">
              <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                    Average Blended Rev / SQ
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    ${Math.round(avgRevPerSq).toLocaleString()} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ Square</span>
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-sky-700 dark:text-sky-400 font-mono">
                  {totalSquares > 0 ? `Based on ${totalSquares.toLocaleString()} SQ` : '0 SQ Booked'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Average Ticket Size
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    ${Math.round(avgTicketSize).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {bookedJobsCount > 0 ? `Across ${bookedJobsCount} Jobs` : '0 Booked Jobs'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Financing Adoption Rate
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {financingAdoptionPct}% {avgMonthlyPayment > 0 && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">(${Math.round(avgMonthlyPayment)}/mo)</span>}
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {financingAdoptionPct > 0 ? `Avg $${Math.round(avgMonthlyPayment)}/mo` : '0% Financed'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Gross Margins Tracked via Accu-Estimate™</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Live Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RevenueVelocityTab;
