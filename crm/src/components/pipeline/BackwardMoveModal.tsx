import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, ArrowRight, X, AlertTriangle, CornerDownRight } from 'lucide-react';

export interface BackwardMoveWarning {
  dealName: string;
  fromTitle: string;
  toTitle: string;
  fromStep?: number;
  toStep?: number;
}

export interface BackwardMoveModalProps {
  warning: BackwardMoveWarning | null;
  onClose: () => void;
}

export function BackwardMoveModal({ warning, onClose }: BackwardMoveModalProps) {
  useEffect(() => {
    if (!warning) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [warning, onClose]);

  if (!warning) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="backward-move-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
              <ShieldAlert size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <h3
                id="backward-move-title"
                className="text-base font-black text-slate-900 dark:text-white tracking-tight"
              >
                Backward Move Not Permitted
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Sales Pipeline Progression Policy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lead & Attempted Move Comparison */}
        <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Lead / Homeowner
            </span>
            <span className="font-black text-slate-800 dark:text-slate-100 text-xs">
              {warning.dealName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {/* From Stage */}
            <div className="flex-1 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                Current Stage
              </div>
              <div className="text-xs font-black text-sky-700 dark:text-sky-300 truncate">
                {warning.fromStep ? `Step ${warning.fromStep}: ` : ''}
                {warning.fromTitle}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0 px-1 text-rose-500">
              <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center">
                <X size={13} className="stroke-[3]" />
              </div>
              <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 mt-0.5">
                Blocked
              </span>
            </div>

            {/* To Stage */}
            <div className="flex-1 p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
              <div className="text-[9px] font-black uppercase tracking-wider text-rose-500 mb-0.5">
                Attempted Backward
              </div>
              <div className="text-xs font-black text-rose-700 dark:text-rose-300 truncate">
                {warning.toStep ? `Step ${warning.toStep}: ` : ''}
                {warning.toTitle}
              </div>
            </div>
          </div>
        </div>

        {/* Policy Explanation */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            <strong className="text-slate-900 dark:text-white font-bold">
              Leads cannot be dragged backward.
            </strong>{' '}
            To protect audit trails and SOP compliance, deals in Rise Up CRM can only move{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">forward</span>{' '}
            through milestones or be marked as{' '}
            <span className="font-semibold text-rose-600 dark:text-rose-400">Closed / Lost</span>.
          </p>
          <div className="flex items-start gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400 pt-1">
            <CornerDownRight size={13} className="shrink-0 text-sky-500 mt-0.5" />
            <span>
              If this homeowner is unresponsive or postponed, log a touchpoint in{' '}
              <strong className="text-slate-700 dark:text-slate-200">{warning.fromTitle}</strong> or
              mark the deal as lost using the deal actions menu.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            Understood (Keep in {warning.fromTitle})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
