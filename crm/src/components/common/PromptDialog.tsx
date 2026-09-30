import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, X } from 'lucide-react';

export interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, defaultValue, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-150"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#0B1320] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-[#1878B8] flex items-center justify-center shrink-0">
              <Edit3 size={18} />
            </div>
            <h3 id="prompt-dialog-title" className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {message && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1878B8]"
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1878B8] hover:bg-[#146399] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
