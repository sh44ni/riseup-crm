import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart3, Calendar, Zap, Sparkles, TrendingUp } from 'lucide-react';
import type { TimelineDataPoint } from '@/types/marketingTypes';

interface MarketingTrafficChartProps {
  timeline: TimelineDataPoint[];
  isHourly?: boolean;
  isMonthly?: boolean;
  loading?: boolean;
}

export const MarketingTrafficChart: React.FC<MarketingTrafficChartProps> = ({
  timeline,
  isHourly,
  isMonthly,
  loading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const [metric, setMetric] = useState<'both' | 'pageviews' | 'sessions'>('both');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Measure container width dynamically for true full-width responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 200) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Summary statistics
  const { maxVal, peakPoint, totalPv, totalSess, avgDailyPv } = useMemo(() => {
    if (!timeline || timeline.length === 0) {
      return { maxVal: 10, peakPoint: null, totalPv: 0, totalSess: 0, avgDailyPv: 0 };
    }
    let max = 0;
    let peak: TimelineDataPoint | null = null;
    let pvSum = 0;
    let sessSum = 0;

    for (const pt of timeline) {
      pvSum += pt.pageviews;
      sessSum += pt.sessions;
      const compareVal = metric === 'sessions' ? pt.sessions : pt.pageviews;
      if (compareVal >= max) {
        max = compareVal;
        peak = pt;
      }
    }
    const ceiling = max > 0 ? Math.ceil(max * 1.2) : 10;
    const avg = timeline.length > 0 ? (pvSum / timeline.length).toFixed(1) : '0';
    return {
      maxVal: ceiling,
      peakPoint: peak,
      totalPv: pvSum,
      totalSess: sessSum,
      avgDailyPv: parseFloat(avg),
    };
  }, [timeline, metric]);

  const height = 270;
  const padX = 46;
  const padY = 34;
  const graphW = Math.max(200, containerWidth - padX * 2);
  const graphH = height - padY * 2;

  // Normalized coordinate points
  const points = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    const len = timeline.length;
    return timeline.map((pt, i) => {
      const x = padX + (len === 1 ? graphW / 2 : (i / (len - 1)) * graphW);
      const yPv = height - padY - (pt.pageviews / maxVal) * graphH;
      const ySess = height - padY - (pt.sessions / maxVal) * graphH;
      return { x, yPv, ySess, ...pt };
    });
  }, [timeline, maxVal, graphW, graphH, height, padX, padY]);

  // Clean SVG smooth bezier curves
  const { pvPath, pvArea, sessPath, sessArea } = useMemo(() => {
    if (points.length === 0) {
      return { pvPath: '', pvArea: '', sessPath: '', sessArea: '' };
    }
    if (points.length === 1) {
      const p = points[0];
      return {
        pvPath: `M ${p.x - 30} ${p.yPv} L ${p.x + 30} ${p.yPv}`,
        pvArea: `M ${p.x - 30} ${height - padY} L ${p.x - 30} ${p.yPv} L ${p.x + 30} ${p.yPv} L ${p.x + 30} ${height - padY} Z`,
        sessPath: `M ${p.x - 30} ${p.ySess} L ${p.x + 30} ${p.ySess}`,
        sessArea: `M ${p.x - 30} ${height - padY} L ${p.x - 30} ${p.ySess} L ${p.x + 30} ${p.ySess} L ${p.x + 30} ${height - padY} Z`,
      };
    }

    let pvd = `M ${points[0].x} ${points[0].yPv}`;
    let sessd = `M ${points[0].x} ${points[0].ySess}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 3;
      const cpX2 = prev.x + ((curr.x - prev.x) * 2) / 3;
      pvd += ` C ${cpX1} ${prev.yPv}, ${cpX2} ${curr.yPv}, ${curr.x} ${curr.yPv}`;
      sessd += ` C ${cpX1} ${prev.ySess}, ${cpX2} ${curr.ySess}, ${curr.x} ${curr.ySess}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const baseLine = height - padY;

    const pArea = `${pvd} L ${last.x} ${baseLine} L ${first.x} ${baseLine} Z`;
    const sArea = `${sessd} L ${last.x} ${baseLine} L ${first.x} ${baseLine} Z`;

    return { pvPath: pvd, pvArea: pArea, sessPath: sessd, sessArea: sArea };
  }, [points, height, padY]);

  // Average line Y coordinate
  const avgLineY = height - padY - (avgDailyPv / maxVal) * graphH;

  // X ticks sparse filter
  const xTicks = useMemo(() => {
    if (points.length <= 10) return points;
    const step = Math.ceil(points.length / 10);
    return points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);
  }, [points]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  // Highest peak point in coordinate space for minimal callout
  const peakCoordPoint = useMemo(() => {
    if (!peakPoint || points.length === 0) return null;
    return points.find((p) => p.day === peakPoint.day) || null;
  }, [peakPoint, points]);

  return (
    <div
      ref={containerRef}
      className="light-glass-panel dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4 sm:p-5 select-none relative overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] flex items-center justify-center text-white shadow-xs">
              <BarChart3 size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Website Traffic Velocity
                </h3>
                {isHourly && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/80">
                    Hourly Scan
                  </span>
                )}
                {isMonthly && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800/80">
                    Monthly Horizon
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full-spectrum telemetry showing raw pageviews, visitor sessions, and interaction density
              </p>
            </div>
          </div>
        </div>

        {/* Quick Highlights & Segmented View Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Peak Callout Badge */}
          {peakPoint && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200/90 dark:border-amber-800/60 text-xs">
              <Zap size={13} className="text-amber-500 fill-amber-500" />
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Peak:</span>
              <span className="font-black text-slate-900 dark:text-white font-mono">
                {peakPoint.pageviews} pv
              </span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">({peakPoint.label})</span>
            </div>
          )}

          {/* Metric Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/90 dark:border-white/10">
            <button
              type="button"
              onClick={() => setMetric('both')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                metric === 'both'
                  ? 'bg-white dark:bg-slate-700/90 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-white/60 hover:dark:bg-slate-700/60'
              }`}
            >
              <div className="flex items-center -space-x-1">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 inline-block border border-white" />
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 inline-block border border-white" />
              </div>
              Combined
            </button>
            <button
              type="button"
              onClick={() => setMetric('pageviews')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                metric === 'pageviews'
                  ? 'bg-white dark:bg-slate-700/90 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-white/60 hover:dark:bg-slate-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 inline-block" />
              Pageviews
            </button>
            <button
              type="button"
              onClick={() => setMetric('sessions')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                metric === 'sessions'
                  ? 'bg-white dark:bg-slate-700/90 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white hover:bg-white/60 hover:dark:bg-slate-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 inline-block" />
              Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Width Clean Vector Canvas */}
      {loading ? (
        <div className="h-64 w-full bg-slate-50/60 dark:bg-slate-800/40 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
          Loading telemetry stream...
        </div>
      ) : points.length === 0 ? (
        <div className="h-64 w-full bg-slate-50/40 dark:bg-slate-800/30 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
          <Calendar size={32} className="mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No telemetry records in this timeframe</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Select a wider date preset from above</p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${containerWidth} ${height}`}
            preserveAspectRatio="none"
            className="w-full overflow-visible cursor-crosshair select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Clean Colorful Pageviews Gradient Along Stroke: Royal Blue -> Sky -> Cyan -> Emerald */}
              <linearGradient id="pvStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="35%" stopColor="#0284C7" />
                <stop offset="70%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>

              {/* Clean Minimal Area Wash: Pageviews */}
              <linearGradient id="pvCleanArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.00" />
              </linearGradient>

              {/* Clean Colorful Sessions Gradient Along Stroke: Violet -> Purple -> Fuchsia -> Rose */}
              <linearGradient id="sessStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="35%" stopColor="#9333EA" />
                <stop offset="70%" stopColor="#C026D3" />
                <stop offset="100%" stopColor="#F43F5E" />
              </linearGradient>

              {/* Clean Minimal Area Wash: Sessions */}
              <linearGradient id="sessCleanArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Values */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const yPos = height - padY - pct * graphH;
              const tickVal = Math.round(pct * maxVal);
              return (
                <g key={idx}>
                  <line
                    x1={padX}
                    y1={yPos}
                    x2={containerWidth - padX}
                    y2={yPos}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeDasharray={pct === 0 ? undefined : '4 4'}
                    strokeWidth={pct === 0 ? 1.5 : 1}
                  />
                  <text
                    x={padX - 10}
                    y={yPos + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fontWeight="600"
                    fill="currentColor"
                    className="font-mono text-slate-400 dark:text-slate-500"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Reference Line: Daily Average */}
            {avgDailyPv > 0 && avgLineY >= padY && avgLineY <= height - padY && (
              <g>
                <line
                  x1={padX}
                  y1={avgLineY}
                  x2={containerWidth - padX}
                  y2={avgLineY}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  strokeOpacity="0.75"
                />
                <text
                  x={containerWidth - padX}
                  y={avgLineY - 5}
                  textAnchor="end"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#059669"
                  className="font-mono"
                >
                  AVG: {avgDailyPv} views
                </text>
              </g>
            )}

            {/* Sessions: Clean Area Fill & Vibrant Colorful Line */}
            {(metric === 'both' || metric === 'sessions') && (
              <>
                <path d={sessArea} fill="url(#sessCleanArea)" />
                <path
                  d={sessPath}
                  fill="none"
                  stroke="url(#sessStrokeGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Pageviews: Clean Area Fill & Vibrant Colorful Line */}
            {(metric === 'both' || metric === 'pageviews') && (
              <>
                <path d={pvArea} fill="url(#pvCleanArea)" />
                <path
                  d={pvPath}
                  fill="none"
                  stroke="url(#pvStrokeGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Clean Data Points when sparse (<= 24 points) */}
            {points.length <= 24 &&
              points.map((pt, i) => (
                <g key={`data-pt-${i}`}>
                  {(metric === 'both' || metric === 'pageviews') && (
                    <circle
                      cx={pt.x}
                      cy={pt.yPv}
                      r="3"
                      fill="#ffffff"
                      stroke="#0284C7"
                      strokeWidth="2"
                    />
                  )}
                  {(metric === 'both' || metric === 'sessions') && (
                    <circle
                      cx={pt.x}
                      cy={pt.ySess}
                      r="2.5"
                      fill="#ffffff"
                      stroke="#9333EA"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              ))}

            {/* Peak Indicator Callout: Clean Minimal Pin */}
            {peakCoordPoint && peakCoordPoint.pageviews > 0 && (
              <g>
                <circle
                  cx={peakCoordPoint.x}
                  cy={peakCoordPoint.yPv}
                  r="4"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <line
                  x1={peakCoordPoint.x}
                  y1={peakCoordPoint.yPv - 4}
                  x2={peakCoordPoint.x}
                  y2={Math.max(padY + 12, peakCoordPoint.yPv - 16)}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <g
                  transform={`translate(${Math.max(
                    padX + 28,
                    Math.min(peakCoordPoint.x, containerWidth - padX - 28)
                  )}, ${Math.max(padY + 4, peakCoordPoint.yPv - 24)})`}
                >
                  <rect
                    x="-26"
                    y="-8"
                    width="52"
                    height="16"
                    rx="8"
                    fill="#ffffff"
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill="#b45309"
                    className="font-mono"
                  >
                    {peakCoordPoint.pageviews} PV
                  </text>
                </g>
              </g>
            )}

            {/* Interactive Hitbox Columns for Scrubbing */}
            {points.map((pt, i) => {
              const nextX = points[i + 1]?.x ?? containerWidth - padX;
              const prevX = points[i - 1]?.x ?? padX;
              const slotWidth = Math.max(14, (nextX - prevX) / 2);

              return (
                <rect
                  key={`slot-${i}`}
                  x={pt.x - slotWidth}
                  y={padY}
                  width={slotWidth * 2}
                  height={graphH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  className="cursor-pointer"
                />
              );
            })}

            {/* Clean Vertical Ruler Line and Highlight Dots */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padY}
                  x2={activePoint.x}
                  y2={height - padY}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Pageview Highlight Dot */}
                {(metric === 'both' || metric === 'pageviews') && (
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yPv}
                    r="5.5"
                    fill="#0284C7"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                )}

                {/* Session Highlight Dot */}
                {(metric === 'both' || metric === 'sessions') && (
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.ySess}
                    r="4.5"
                    fill="#9333EA"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                )}
              </g>
            )}

            {/* X-Axis Tick Labels */}
            {xTicks.map((pt, idx) => (
              <text
                key={`xtick-${idx}`}
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill="#64748b"
              >
                {pt.label}
              </text>
            ))}
          </svg>

          {/* Clean Glass Inspection Tooltip */}
          {activePoint && (
            <div
              style={{
                left: `${Math.max(
                  12,
                  Math.min(activePoint.x - 90, containerWidth - 210)
                )}px`,
                top: `${Math.max(6, Math.min(activePoint.yPv - 95, height - 110))}px`,
              }}
              className="pointer-events-none absolute z-30 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 shadow-md p-3 text-slate-800 dark:text-slate-200 transition-all duration-75 min-w-[185px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5 mb-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {activePoint.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                  {activePoint.day}
                </span>
              </div>

              {/* Metric Breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5 text-[11px]">
                    <span className="w-2.5 h-2 rounded-sm bg-gradient-to-r from-blue-600 to-cyan-400 inline-block" />
                    Pageviews:
                  </span>
                  <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                    {activePoint.pageviews.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5 text-[11px]">
                    <span className="w-2.5 h-2 rounded-sm bg-gradient-to-r from-violet-600 to-pink-500 inline-block" />
                    Sessions:
                  </span>
                  <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                    {activePoint.sessions.toLocaleString()}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-100/80 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Engagement:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {activePoint.sessions > 0
                      ? (activePoint.pageviews / activePoint.sessions).toFixed(1)
                      : '1.0'}{' '}
                    pv/session
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Summary Strip at bottom of graph */}
      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 inline-block" />
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Pageviews:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono">{totalPv.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 inline-block" />
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Sessions:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono">{totalSess.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Daily Average:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono">{avgDailyPv} views/day</span>
          </div>
        </div>

        {peakPoint && (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/10 px-3 py-1 rounded-xl">
            <Sparkles size={13} className="text-amber-500" />
            <span className="font-bold">Peak Traffic Spike:</span>
            <span className="font-black text-[#1878B8] dark:text-sky-400 font-mono">
              {peakPoint.pageviews.toLocaleString()} views
            </span>
            <span className="text-slate-400 dark:text-slate-500">on {peakPoint.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
