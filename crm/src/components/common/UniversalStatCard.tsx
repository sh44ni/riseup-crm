import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ─── 500ms Intentional Hover Hook ──────────────────────────────────────────
// Prevents accidental reveals when cursor sweeps across cards.
export function useHoverDelay(openDelay = 500, closeDelay = 140) {
  const [active, setActive] = useState(false);
  const openT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onEnter = useCallback(() => {
    if (closeT.current) clearTimeout(closeT.current);
    openT.current = setTimeout(() => setActive(true), openDelay);
  }, [openDelay]);

  const onLeave = useCallback(() => {
    if (openT.current) clearTimeout(openT.current);
    closeT.current = setTimeout(() => setActive(false), closeDelay);
  }, [closeDelay]);

  const onPopoverEnter = useCallback(() => {
    if (closeT.current) clearTimeout(closeT.current);
  }, []);

  return { active, onEnter, onLeave, onPopoverEnter };
}

// ─── Trend Delta Pill ──────────────────────────────────────────────────────
export function TrendPill({
  delta,
  suffix = '%',
  customLabel,
}: {
  delta?: number | null;
  suffix?: string;
  customLabel?: string;
}) {
  if (customLabel) {
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
        {customLabel}
      </span>
    );
  }
  if (delta === null || delta === undefined) return null;
  const isPositive = delta >= 0;
  const label = `${isPositive ? '+' : ''}${delta}${suffix}`;

  if (isPositive) {
    return (
      <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50/90 border border-emerald-200/90 shadow-2xs backdrop-blur-xs">
        <TrendingUp size={9} className="stroke-[2.5]" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold text-rose-600 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-50/90 border border-rose-200/90 shadow-2xs backdrop-blur-xs">
      <TrendingDown size={9} className="stroke-[2.5]" />
      <span>{label}</span>
    </span>
  );
}

// ─── Stat Shimmer Skeleton ─────────────────────────────────────────────────
export function StatSkeleton() {
  return <span className="inline-block w-9 h-6 bg-slate-200/80 animate-pulse rounded align-middle" />;
}

// ─── Default Sparkline Path Presets ────────────────────────────────────────
const DEFAULT_SPARKLINES: Record<string, { mini: string; line: string; area: string; dot: [number, number] }> = {
  upward: {
    mini: 'M 2 22 Q 18 20, 30 14 T 54 10 T 73 3',
    line: 'M 6 52 C 44 46 76 32 110 28 S 174 18 228 8',
    area: 'M 6 52 C 44 46 76 32 110 28 S 174 18 228 8 L 228 64 L 6 64 Z',
    dot: [228, 8],
  },
  steady: {
    mini: 'M 2 16 Q 22 14, 40 16 T 58 12 T 73 6',
    line: 'M 6 48 C 50 44 88 40 124 34 S 180 20 228 12',
    area: 'M 6 48 C 50 44 88 40 124 34 S 180 20 228 12 L 228 64 L 6 64 Z',
    dot: [228, 12],
  },
  downward: {
    mini: 'M 2 8 Q 18 12, 34 16 T 56 22 T 73 24',
    line: 'M 6 16 C 44 22 76 36 110 40 S 174 48 228 54',
    area: 'M 6 16 C 44 22 76 36 110 40 S 174 48 228 54 L 228 64 L 6 64 Z',
    dot: [228, 54],
  },
};

export function dataToMiniPath(data: number[] | undefined, width = 73, height = 28, pad = 2): string {
  const zeroY = height - pad - 2;
  if (!data || data.length < 2) return `M ${pad} ${zeroY} L ${width - pad} ${zeroY}`;
  const max = Math.max(...data);
  const min = Math.min(...data);
  if (max === 0 && min === 0) {
    return `M ${pad} ${zeroY} L ${width - pad} ${zeroY}`;
  }
  if (max === min) {
    const midY = Math.round(height / 2);
    return `M ${pad} ${midY} L ${width - pad} ${midY}`;
  }
  const range = max - min;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2 - 2),
  }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx.toFixed(1)} ${prev.y.toFixed(1)}, ${cpx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  return d;
}

export function dataToPopoverPaths(data: number[] | undefined, width = 234, height = 64, padX = 6, padY = 6): {
  line: string; area: string; dotCx: number; dotCy: number;
} {
  const zeroY = height - padY - 2;
  const flatZeroFallback = {
    line: `M ${padX} ${zeroY} L ${width - padX} ${zeroY}`,
    area: `M ${padX} ${zeroY} L ${width - padX} ${zeroY} L ${width - padX} ${height} L ${padX} ${height} Z`,
    dotCx: width - padX,
    dotCy: zeroY,
  };

  if (!data || data.length < 2) return flatZeroFallback;
  const max = Math.max(...data);
  const min = Math.min(...data);
  if (max === 0 && min === 0) return flatZeroFallback;

  if (max === min) {
    const midY = Math.round(height / 2);
    return {
      line: `M ${padX} ${midY} L ${width - padX} ${midY}`,
      area: `M ${padX} ${midY} L ${width - padX} ${midY} L ${width - padX} ${height} L ${padX} ${height} Z`,
      dotCx: width - padX,
      dotCy: midY,
    };
  }

  const range = max - min;
  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (width - padX * 2),
    y: padY + (1 - (v - min) / range) * (height - padY * 2 - 4),
  }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    line += ` C ${cpx.toFixed(1)} ${prev.y.toFixed(1)}, ${cpx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  const area = `${line} L ${(width - padX).toFixed(1)} ${height} L ${padX} ${height} Z`;
  return { line, area, dotCx: Math.round(last.x), dotCy: Math.round(last.y) };
}

// ─── Popover Props & Component ─────────────────────────────────────────────
interface UniversalPopoverProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  sharePct?: number;
  shareLabel?: string;
  stageLabel?: string;
  stageBadgeColor?: string;
  thisPeriodText?: string | number;
  priorValueText?: string | number;
  color?: string;
  svgLine?: string;
  svgArea?: string;
  dotCx?: number;
  dotCy?: number;
  autoRefreshText?: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onPopoverEnter: () => void;
  onLeave: () => void;
}

export function StatCardPopover({
  label,
  value,
  delta,
  deltaLabel,
  sharePct = 0,
  shareLabel = 'Pipeline share',
  stageLabel,
  stageBadgeColor,
  thisPeriodText,
  priorValueText,
  color = '#0284c7',
  svgLine,
  svgArea,
  dotCx = 228,
  dotCy = 56,
  autoRefreshText = 'Auto-refreshes every 60s',
  anchorRef,
  onPopoverEnter,
  onLeave,
}: UniversalPopoverProps) {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const popW = 276;
  const above = rect.top > window.innerHeight * 0.52;
  const rawLeft = rect.left + rect.width / 2 - popW / 2;
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popW - 8));

  const posStyle: React.CSSProperties = above
    ? { position: 'fixed', bottom: window.innerHeight - rect.top + 8, left, width: popW, zIndex: 99998, transformOrigin: 'bottom center' }
    : { position: 'fixed', top: rect.bottom + 8, left, width: popW, zIndex: 99998, transformOrigin: 'top center' };

  const deltaPos = delta != null && delta > 0;
  const deltaNeg = delta != null && delta < 0;
  const deltaText = deltaLabel
    ? deltaLabel
    : delta != null
    ? `${deltaPos ? '+' : ''}${delta.toFixed(1)}% MoM`
    : 'Live Telemetry';

  // Compute prior value if numeric and delta present
  let computedPrior: string | number = '—';
  if (priorValueText !== undefined) {
    computedPrior = priorValueText;
  } else if (typeof value === 'number' && delta != null) {
    computedPrior = Math.max(0, Math.round(value / (1 + delta / 100)));
  }

  const gradId = `univ-stat-grad-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  const resolvedLine = svgLine || 'M 6 56 L 228 56';
  const resolvedArea = svgArea || 'M 6 56 L 228 56 L 228 64 L 6 64 Z';
  const badgeColor = stageBadgeColor || color;

  return createPortal(
    <div
      style={posStyle}
      onMouseEnter={onPopoverEnter}
      onMouseLeave={onLeave}
      className="animate-in fade-in zoom-in-95 duration-150 rounded-2xl bg-white/98 dark:bg-[#0B1320]/98 backdrop-blur-2xl border border-white/95 dark:border-white/12 shadow-[0_20px_50px_rgba(15,23,42,0.16),0_0_0_1px_rgba(255,255,255,0.95)_inset] dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden text-slate-900 dark:text-slate-100"
    >
      {/* Accent gradient top rim */}
      <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${color}70, ${color})` }} />

      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-slate-100/90 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-3.5 rounded-full" style={{ background: color }} />
          <span className="text-[12px] font-black text-slate-900 dark:text-white tracking-tight">{label}</span>
        </div>
        <span
          className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${
            deltaPos
              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              : deltaNeg
              ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          {deltaText}
        </span>
      </div>

      {/* Large SVG sparkline */}
      <div className="px-3 pt-2.5 pb-1">
        <svg width="100%" height="62" viewBox="0 0 234 64" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={color} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          {/* Subtle grid lines */}
          <line x1="6" y1="21" x2="228" y2="21" stroke={color} strokeOpacity="0.08" strokeDasharray="5 4" strokeWidth="1" />
          <line x1="6" y1="42" x2="228" y2="42" stroke={color} strokeOpacity="0.08" strokeDasharray="5 4" strokeWidth="1" />
          {/* Area fill */}
          <path d={resolvedArea} fill={`url(#${gradId})`} />
          {/* Stroke */}
          <path d={resolvedLine} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          {/* Live endpoint dot — outer white ring */}
          <circle cx={dotCx} cy={dotCy} r="5" fill="white" stroke="#cbd5e1" strokeWidth="1" />
          {/* Live endpoint dot — inner colored pulse */}
          <circle cx={dotCx} cy={dotCy} r="3" fill={color}>
            <animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/15 to-transparent mx-3" />

      {/* Breakdown Metrics */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Row 1: This period vs Prior */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">This period</span>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-black text-slate-900 dark:text-white">
              {thisPeriodText !== undefined ? thisPeriodText : value}
            </span>
            <span className="text-[9px] text-slate-400">vs</span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {computedPrior} prior
            </span>
          </div>
        </div>

        {/* Row 2: Pipeline share / conversion progress bar */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold shrink-0">{shareLabel}</span>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">{Math.round(sharePct)}%</span>
            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 border border-slate-200/50 dark:border-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, sharePct))}%`, background: color, transition: 'width 0.7s ease' }}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Stage / Context Badge */}
        {stageLabel && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Stage</span>
            <span
              className="text-[9.5px] font-black px-2 py-0.5 rounded-full border"
              style={{ color: badgeColor, borderColor: `${badgeColor}40`, background: `${badgeColor}15` }}
            >
              {stageLabel}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3.5">
        <div className="rounded-xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10 px-3 py-1.5 flex items-center justify-between">
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">{autoRefreshText}</span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold" style={{ color }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            Live
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Universal Stat Card Props ─────────────────────────────────────────────
export interface UniversalStatCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconGradient?: string;
  color?: string;
  hoverBorderColor?: string;
  blurColor?: string;
  footnoteLeft?: string;
  footnoteRight?: string | React.ReactNode;
  sharePct?: number;
  shareLabel?: string;
  stageLabel?: string;
  thisPeriodText?: string | number;
  priorValueText?: string | number;
  svgLine?: string;
  svgArea?: string;
  dotCx?: number;
  dotCy?: number;
  miniSvgPath?: string;
  sparklineData?: number[];
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function UniversalStatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconGradient = 'from-[#1878B8] to-[#55C4F5]',
  color = '#0284c7',
  hoverBorderColor = 'hover:border-sky-400',
  blurColor = 'bg-sky-400/15 group-hover:bg-sky-400/25',
  footnoteLeft,
  footnoteRight,
  sharePct = 0,
  shareLabel = 'Pipeline share',
  stageLabel,
  thisPeriodText,
  priorValueText,
  svgLine,
  svgArea,
  dotCx = 228,
  dotCy = 8,
  miniSvgPath,
  sparklineData,
  isLoading = false,
  className = '',
  onClick,
}: UniversalStatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hover = useHoverDelay(500, 140);

  const dynamicMini = sparklineData && sparklineData.length >= 2 ? dataToMiniPath(sparklineData) : '';
  const resolvedMiniPath =
    dynamicMini ||
    miniSvgPath ||
    (delta != null && delta < 0
      ? DEFAULT_SPARKLINES.downward.mini
      : DEFAULT_SPARKLINES.upward.mini);

  const dynamicPopover = sparklineData && sparklineData.length >= 2 ? dataToPopoverPaths(sparklineData) : null;
  const resolvedSvgLine = svgLine || dynamicPopover?.line;
  const resolvedSvgArea = svgArea || dynamicPopover?.area;
  const resolvedDotCx = dotCx !== 228 ? dotCx : (dynamicPopover?.dotCx ?? 228);
  const resolvedDotCy = dotCy !== 8 ? dotCy : (dynamicPopover?.dotCy ?? 8);

  const gradId = `mini-grad-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={hover.onEnter}
        onMouseLeave={hover.onLeave}
        onClick={onClick}
        className={`light-glass-card glossy-sheen rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-default ${hoverBorderColor} text-slate-900 dark:text-slate-100 ${className}`}
      >
        {/* Glow orb */}
        <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl pointer-events-none transition-colors ${blurColor}`} />

        {/* Top row: Icon + Delta Pill */}
        <div className="flex items-center justify-between relative z-10">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${iconGradient} flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon size={13} className="stroke-[2.5]" />
          </div>
          <TrendPill delta={delta} customLabel={deltaLabel} />
        </div>

        {/* Middle row: Big Metric + Mini Sparkline */}
        <div className="flex items-end justify-between mt-1.5 relative z-10">
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {isLoading ? <StatSkeleton /> : value}
            </div>
            <div className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-tight">
              {label}
            </div>
          </div>
          <div className="shrink-0 mb-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
            <svg className="w-14 h-6" viewBox="0 0 75 28" fill="none">
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={`${resolvedMiniPath} L 73 28 L 2 28 Z`} fill={`url(#${gradId})`} />
              <path d={resolvedMiniPath} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <circle cx="73" cy="3" r="2.2" fill={color} className="animate-pulse" />
            </svg>
          </div>
        </div>

        {/* Bottom row: Footnotes / progress */}
        {(footnoteLeft || footnoteRight) && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-white/10 relative z-10 flex items-center justify-between text-[8.5px]">
            <span className="text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[55%]">
              {footnoteLeft}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {typeof footnoteRight === 'string' ? (
                <span className="font-bold truncate max-w-[80px]" style={{ color }}>
                  {footnoteRight}
                </span>
              ) : (
                footnoteRight
              )}
            </div>
          </div>
        )}
      </div>

      {/* Portal Popover */}
      {hover.active && (
        <StatCardPopover
          label={label}
          value={value}
          delta={delta}
          deltaLabel={deltaLabel}
          sharePct={sharePct}
          shareLabel={shareLabel}
          stageLabel={stageLabel}
          thisPeriodText={thisPeriodText}
          priorValueText={priorValueText}
          color={color}
          svgLine={resolvedSvgLine}
          svgArea={resolvedSvgArea}
          dotCx={resolvedDotCx}
          dotCy={resolvedDotCy}
          anchorRef={cardRef}
          onPopoverEnter={hover.onPopoverEnter}
          onLeave={hover.onLeave}
        />
      )}
    </>
  );
}

export default UniversalStatCard;
