import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const toastMethods = useMemo(
    () => ({
      success: (msg: string, dur?: number) => addToast('success', msg, dur),
      error: (msg: string, dur?: number) => addToast('error', msg, dur),
      info: (msg: string, dur?: number) => addToast('info', msg, dur),
      warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: toastMethods, dismissToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="true"
            className="fixed top-5 right-5 z-[999999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
          >
            {toasts.map((t) => {
              const isError = t.type === 'error';
              const isSuccess = t.type === 'success';
              const isWarning = t.type === 'warning';

              return (
                <div
                  key={t.id}
                  role={isError ? 'alert' : 'status'}
                  className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 transition-all ${
                    isSuccess
                      ? 'bg-slate-900/95 dark:bg-[#0B1320]/95 border-emerald-500/40 text-white shadow-emerald-950/20'
                      : isError
                      ? 'bg-slate-900/95 dark:bg-[#0B1320]/95 border-rose-500/40 text-white shadow-rose-950/20'
                      : isWarning
                      ? 'bg-slate-900/95 dark:bg-[#0B1320]/95 border-amber-500/40 text-white shadow-amber-950/20'
                      : 'bg-slate-900/95 dark:bg-[#0B1320]/95 border-sky-500/40 text-white shadow-sky-950/20'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isSuccess && <CheckCircle2 size={16} className="text-emerald-400" />}
                    {isError && <AlertCircle size={16} className="text-rose-400" />}
                    {isWarning && <AlertTriangle size={16} className="text-amber-400" />}
                    {t.type === 'info' && <Info size={16} className="text-sky-400" />}
                  </div>

                  <div className="flex-1 text-xs font-semibold leading-relaxed break-words">
                    {t.message}
                  </div>

                  <button
                    type="button"
                    onClick={() => dismissToast(t.id)}
                    className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    aria-label="Dismiss notification"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
