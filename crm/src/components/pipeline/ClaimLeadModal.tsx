import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck, X, AlertTriangle, Loader2, MapPin, DollarSign, Briefcase } from 'lucide-react';

export interface ClaimLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  leadName: string;
  leadId?: string | number;
  service?: string;
  value?: number;
  location?: string;
}

export function ClaimLeadModal({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  leadId,
  service,
  value,
  location,
}: ClaimLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to claim lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setError(null);
    onClose();
  };

  return createPortal(
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/90 dark:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular top bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Claim Lead Ownership
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Confirm assignment before advancing this lead
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Cancel and close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lead Context Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">
              {leadName || 'Lead Details'}
            </span>
            {leadId && (
              <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                #{String(leadId).toUpperCase()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
            {service && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold truncate">
                <Briefcase size={12} className="text-[#1878B8] shrink-0" />
                <span className="truncate">{service}</span>
              </div>
            )}
            {value !== undefined && value > 0 && (
              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-black">
                <DollarSign size={12} className="text-emerald-500 shrink-0" />
                <span>{value.toLocaleString()}</span>
              </div>
            )}
            {location && (
              <div className="col-span-2 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium truncate">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Body Description */}
        <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-800/40 text-xs text-sky-900 dark:text-sky-200 space-y-1">
          <p className="font-semibold leading-relaxed">
            Are you sure you want to claim this lead?
          </p>
          <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-normal font-normal">
            You will become the primary assigned team member. Once claimed, you can advance stages, record estimates, and coordinate follow-ups.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 font-semibold animate-in fade-in duration-150">
            <AlertTriangle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel (Leave Unchanged)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <UserCheck size={13} />
                <span>Confirm &amp; Claim Lead</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
