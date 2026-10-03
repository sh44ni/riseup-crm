import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

export interface CustomizerShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  resetConfirmTitle?: string;
  resetConfirmMessage?: string;
  onSave: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  onMouseUp?: () => void;
  maxWidth?: string;
}

export function CustomizerShell({
  isOpen,
  onClose,
  icon,
  title,
  subtitle,
  badge,
  statusBadge,
  children,
  onReset,
  resetLabel = 'Reset to Defaults',
  resetConfirmTitle = 'Reset Customizer Settings',
  resetConfirmMessage = 'Are you sure you want to reset settings back to original defaults?',
  onSave,
  saveLabel = 'Save & Apply Changes',
  isSaving = false,
  onMouseUp,
  maxWidth = 'max-w-4xl',
}: CustomizerShellProps) {
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {createPortal(
        <div
          onClick={onClose}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseUp={onMouseUp}
            className={`w-full ${maxWidth} bg-white/95 dark:bg-[#090E17] border border-slate-200/80 dark:border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.2)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] my-auto text-slate-800 dark:text-slate-200 select-none animate-in zoom-in-95 duration-200`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-sky-500/20 border border-sky-300/40 shrink-0">
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      {title}
                    </h2>
                    {badge}
                    {statusBadge}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            {children}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02] shrink-0">
              {onReset ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmResetOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>{resetLabel}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] text-white text-xs font-bold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-sky-300/40 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} className="stroke-[3]" />
                  )}
                  <span>{saveLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {onReset && (
        <ConfirmDialog
          isOpen={isConfirmResetOpen}
          title={resetConfirmTitle}
          message={resetConfirmMessage}
          confirmLabel={resetLabel}
          variant="warning"
          onConfirm={() => {
            onReset();
            setIsConfirmResetOpen(false);
            onClose();
          }}
          onCancel={() => setIsConfirmResetOpen(false)}
        />
      )}
    </>
  );
}
