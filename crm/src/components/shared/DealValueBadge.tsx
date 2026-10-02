/**
 * DealValueBadge — shared value display component for all pipeline/dashboard cards and modals.
 *
 * Implements the value hierarchy:
 *  1. Contract signed  → "Contract Value" (green tint)
 *  2. Estimate sent    → "Estimate Amount" (blue tint)
 *  3. Sq ft recorded   → "Est. from Sq Ft" (amber tint, italic)
 *  4. Nothing          → "Unavailable" with tooltip
 */

import React from 'react';
import { AlertCircle, FileCheck, FileText, Ruler } from 'lucide-react';
import { resolveDisplayValue, DealValueParams } from '@/utils/dealValue';

export interface DealValueBadgeProps extends DealValueParams {
  /** UI control */
  canViewFinances: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'base';
  /** Extra CSS class on the outer element */
  className?: string;
}

export function DealValueBadge(props: DealValueBadgeProps) {
  const { canViewFinances, size = 'xs', className = '' } = props;

  if (!canViewFinances) {
    return (
      <span className={`font-bold text-slate-400 dark:text-slate-500 ${size === 'base' ? 'text-sm' : size === 'sm' ? 'text-xs' : 'text-[9.5px]'} ${className}`}>
        —
      </span>
    );
  }

  const resolved = resolveDisplayValue(props);

  const textSizes = {
    base: 'text-base',
    sm: 'text-xs',
    xs: 'text-[9.5px]',
  };

  if (resolved.source === 'unavailable') {
    return (
      <span
        title={resolved.tooltip}
        className={`inline-flex items-center gap-0.5 font-semibold text-slate-400 dark:text-slate-500 cursor-help ${textSizes[size]} ${className}`}
      >
        <AlertCircle size={size === 'base' ? 13 : 9} className="text-amber-400 shrink-0" />
        <span>{resolved.label}</span>
      </span>
    );
  }

  const sourceStyles: Record<string, string> = {
    contract:       'text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-700/40',
    estimate_sent:  'text-sky-800 dark:text-slate-100 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10',
    sqft_estimate:  'text-amber-800 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/30',
  };

  const sourceIcon = {
    contract: <FileCheck size={size === 'base' ? 12 : 9} className="text-emerald-600 dark:text-emerald-400 shrink-0" />,
    estimate_sent: <FileText size={size === 'base' ? 12 : 9} className="text-sky-600 dark:text-sky-400 shrink-0" />,
    sqft_estimate: <Ruler size={size === 'base' ? 12 : 9} className="text-amber-600 dark:text-amber-400 shrink-0" />,
  };

  return (
    <span
      title={resolved.tooltip}
      className={`inline-flex items-center gap-0.5 font-black px-1.5 py-0.5 rounded shadow-2xs cursor-help ${textSizes[size]} ${sourceStyles[resolved.source] ?? ''} ${className}`}
    >
      {sourceIcon[resolved.source as keyof typeof sourceIcon]}
      <span>${resolved.amount!.toLocaleString()}</span>
    </span>
  );
}

/**
 * Inline version — just the dollar amount text with no border/background.
 * Used in compact table rows or modal headers.
 */
export function DealValueText(props: Omit<DealValueBadgeProps, 'size'>) {
  const { canViewFinances, className = '' } = props;
  if (!canViewFinances) return <span className={`text-slate-400 ${className}`}>—</span>;

  const resolved = resolveDisplayValue(props);

  if (resolved.source === 'unavailable') {
    return (
      <span title={resolved.tooltip} className={`text-slate-400 dark:text-slate-500 font-medium cursor-help flex items-center gap-0.5 ${className}`}>
        <AlertCircle size={11} className="text-amber-400" />
        {resolved.label}
      </span>
    );
  }

  const colorMap: Record<string, string> = {
    contract:      'text-emerald-700 dark:text-emerald-300',
    estimate_sent: 'text-slate-900 dark:text-white',
    sqft_estimate: 'text-amber-700 dark:text-amber-300',
  };

  return (
    <span title={resolved.tooltip} className={`font-black cursor-help ${colorMap[resolved.source] ?? ''} ${className}`}>
      ${resolved.amount!.toLocaleString()}
    </span>
  );
}
