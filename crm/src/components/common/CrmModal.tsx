import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface CrmModalBadge {
  label: string;
  variant?: 'sky' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
}

export interface CrmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: CrmModalBadge | string;
  icon?: React.ReactNode;
  iconGradient?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  sky: 'bg-sky-50 dark:bg-sky-500/20 text-[#0284c7] dark:text-sky-300 border-sky-200/80 dark:border-sky-500/30',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/30',
  amber: 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/30',
  purple: 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-500/30',
  rose: 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/30',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
};

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

/**
 * CrmModal — Standardized Light-Glass Modal Shell
 * 
 * Provides consistent:
 * - Ambient Caustic lighting in backdrop
 * - Specular highlight bevel
 * - High-clarity white optical glass backdrop (bg-white/95 backdrop-blur-3xl)
 * - Standard header with icon pill, title, badge, and subtitle
 * - Clean close button with hover & Escape key dismiss
 * - Scroll locking on body
 * - Standardized footer action bar
 */
export function CrmModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  iconGradient = 'from-[#1878B8] to-[#0284c7]',
  maxWidth = 'lg',
  children,
  footer,
  className = '',
}: CrmModalProps) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const badgeObj: CrmModalBadge | null =
    typeof badge === 'string'
      ? { label: badge, variant: 'sky' }
      : badge || null;

  const badgeClass = badgeObj
    ? BADGE_STYLES[badgeObj.variant || 'sky'] || BADGE_STYLES.sky
    : '';

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || 'max-w-lg';

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      {/* Ambient Caustic Light Orbs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-sky-400/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-80 h-80 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Optical Glass Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} rounded-[26px] bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/12 shadow-[0_25px_90px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col text-slate-800 dark:text-slate-100 ${className}`}
      >
        {/* Specular Top Highlight Bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200/75 dark:border-white/10 flex items-start justify-between gap-4 bg-gradient-to-r from-sky-50/60 via-slate-50/40 to-white/30 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-slate-900/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${iconGradient} text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {title}
                </h2>
                {badgeObj && (
                  <span
                    className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border shadow-2xs uppercase tracking-wider ${badgeClass}`}
                  >
                    {badgeObj.label}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
            className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] no-scrollbar">
          {children}
        </div>

        {/* Modal Footer (Optional) */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-slate-200/75 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
