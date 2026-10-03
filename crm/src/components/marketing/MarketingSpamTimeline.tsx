import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShieldAlert, Calendar, Sparkles, TrendingDown } from 'lucide-react';
import type { SpamTimelinePoint } from '@/types/marketingTypes';

interface MarketingSpamTimelineProps {
  timeline: SpamTimelinePoint[];
  loading?: boolean;
}

export const MarketingSpamTimeline: React.FC<MarketingSpamTimelineProps> = ({
  timeline,
  loading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const { maxVal, peakPoint, totalBlocked, avgDaily } = useMemo(() => {
    if (!timeline || timeline.length === 0) {
      return { maxVal: 10, peakPoint: null, totalBlocked: 0, avgDaily: 0 };
    }
    let max = 0;
    let peak: SpamTimelinePoint | null = null;
    let sum = 0;

    for (const pt of timeline) {
      sum += pt.count;
      if (pt.count >= max) {
        max = pt.count;
        peak = pt;
      }
    }
    const ceiling = max > 0 ? Math.ceil(max * 1.25) : 10;
    const avg = timeline.length > 0 ? Math.round((sum / timeline.length) * 10) / 10 : 0;
    return {
      maxVal: ceiling,
      peakPoint: peak,
      totalBlocked: sum,
      avgDaily: avg,
    };
  }, [timeline]);

  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const usableWidth = Math.max(containerWidth - paddingX * 2, 200);
  const usableHeight = height - paddingY * 2;

  const points = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    const step = timeline.length > 1 ? usableWidth / (timeline.length - 1) : usableWidth;

    return timeline.map((pt, i) => {
      const x = paddingX + i * step;
      const y = paddingY + (1 - pt.count / (maxVal || 1)) * usableHeight;
      return { x, y, ...pt };
    });
  }, [timeline, usableWidth, usableHeight, maxVal, paddingX, paddingY]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      return `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const bottom = paddingY + usableHeight;
    return `${pathD} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [pathD, points, paddingY, usableHeight]);

  return (
    <div
      ref={containerRef}
      className="light-glass-card dark:bg-slate-900/60 dark:border dark:border-white/10 glossy-sheen rounded-2xl p-4 shadow-sm space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert size={15} />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Bot Interception Timeline
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-[10px] font-black text-rose-700 dark:text-rose-300">
              {totalBlocked.toLocaleString()} Blocked
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Daily frequency of scrapers, honeypot traps, and spam pitches caught by the shield
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-extrabold">Peak Block Day</div>
            <div className="text-xs font-black text-slate-800 dark:text-white">
              {peakPoint ? `${peakPoint.count} on ${peakPoint.label}` : '—'}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-200 dark:border-white/10">
            <div className="text-[10px] text-slate-400 uppercase font-extrabold">Avg Daily Intercepts</div>
            <div className="text-xs font-black text-rose-600 dark:text-rose-400">
              {avgDaily} / day
            </div>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[180px] select-none">
        {points.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs gap-1">
            <Sparkles size={16} />
            <span>No blocked spam attempts recorded in this timeframe</span>
          </div>
        ) : (
          <svg width="100%" height={height} className="overflow-visible">
            <defs>
              <linearGradient id="spamAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0, 0.5, 1].map((pct, idx) => {
              const y = paddingY + pct * usableHeight;
              const val = Math.round((1 - pct) * maxVal);
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={containerWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-white/5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9.5px] fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area & Stroke */}
            <path d={areaD} fill="url(#spamAreaGradient)" />
            <path
              d={pathD}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Hover Target */}
            {points.map((pt, i) => {
              const isHovered = hoverIndex === i;
              return (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5 : 3}
                    className="fill-white dark:fill-slate-900 stroke-rose-500 transition-all cursor-pointer"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip Popup */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            className="absolute z-10 pointer-events-none p-2 rounded-xl bg-slate-900 text-white text-[11px] shadow-lg border border-white/10 -translate-x-1/2 -translate-y-full -top-1"
            style={{ left: points[hoverIndex].x }}
          >
            <div className="font-bold flex items-center gap-1.5 text-rose-300">
              <span>{points[hoverIndex].label}</span>
            </div>
            <div className="text-white font-extrabold text-xs">
              {points[hoverIndex].count} attempts blocked
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
