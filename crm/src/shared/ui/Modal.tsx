import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

// Ref-counted body scroll lock to support nested modals without leaking overflow state
let openModalsCount = 0;
let originalOverflow = '';

function lockScroll(): void {
  if (typeof document === 'undefined') return;
  if (openModalsCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openModalsCount++;
}

function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  openModalsCount = Math.max(0, openModalsCount - 1);
  if (openModalsCount === 0) {
    document.body.style.overflow = originalOverflow;
  }
}

export interface ModalBadge {
  label: string;
  variant?: 'brand' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ModalBadge | string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

const BADGE_VARIANTS: Record<string, string> = {
  brand: 'bg-sky-50 dark:bg-sky-950/60 text-brand-600 dark:text-sky-300 border-sky-200/80 dark:border-sky-800',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
  amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
  purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800',
  rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
};

const MAX_WIDTHS: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  maxWidth = 'lg',
  children,
  footer,
  className,
  closeOnBackdrop = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  // Ref-counted scroll lock & focus trap / restore
  useEffect(() => {
    if (!isOpen) return;

    lockScroll();
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    // Focus initial element or modal container
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === 'function') {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const badgeObj: ModalBadge | null =
    typeof badge === 'string'
      ? { label: badge, variant: 'brand' }
      : badge || null;

  const badgeClass = badgeObj
    ? BADGE_VARIANTS[badgeObj.variant || 'brand'] || BADGE_VARIANTS.brand
    : '';

  const maxWidthClass = MAX_WIDTHS[maxWidth] || 'max-w-lg';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Dialog Shell */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-200 flex flex-col max-h-[90vh] overflow-hidden focus:outline-none',
          maxWidthClass,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {title}
                </h2>
                {badgeObj && (
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full border',
                      badgeClass
                    )}
                  >
                    {badgeObj.label}
                  </span>
                )}
              </div>
              {subtitle && (
                <p id={subtitleId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 px-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
