import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, CheckCircle2, PenLine } from 'lucide-react';
import type { Lead } from '@/api/leadsApi';

// ── Loss reason catalog (exported so LeadsPage & ClientsPage can use it) ─────
export const LOSS_REASONS: Record<
  string,
  { label: string; icon: string; badgeClass: string; desc: string }
> = {
  competitor_price: {
    label: 'Competitor Price',
    icon: '📉',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    desc: 'Lost to a lower-bidding roofing contractor',
  },
  ghosted: {
    label: 'Ghosted / Unresponsive',
    icon: '👻',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300/80',
    desc: 'Homeowner stopped responding after outreach',
  },
  postponed: {
    label: 'Project Postponed',
    icon: '⏸️',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    desc: 'Delayed due to budget, timing, or solar install',
  },
  diy_handyman: {
    label: 'DIY / Handyman',
    icon: '🔨',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80',
    desc: 'Chose to patch without a certified roofer',
  },
  financing_denied: {
    label: 'Financing Denied',
    icon: '💳',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
    desc: 'Home improvement loan was rejected',
  },
  out_of_area: {
    label: 'Out of Area',
    icon: '📍',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
    desc: 'Beyond our North County service radius',
  },
  insurance_denied: {
    label: 'Insurance Denied',
    icon: '🚫',
    badgeClass: 'bg-red-50 text-red-700 border-red-200/80',
    desc: 'Insurance claim was denied or underpaid',
  },
  already_hired: {
    label: 'Already Hired Someone',
    icon: '🤝',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
    desc: 'Client hired another contractor before we could close',
  },
  price_too_high: {
    label: 'Price Too High',
    icon: '💰',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200/80',
    desc: 'Our quote exceeded what the homeowner was willing to pay',
  },
  sold_moved: {
    label: 'Sold / Moving',
    icon: '🏡',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    desc: 'Property sold or homeowner is relocating',
  },
  custom: {
    label: 'Other / Custom',
    icon: '✏️',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300/80',
    desc: 'Enter a custom reason below',
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface MarkLeadLostModalProps {
  lead: Lead | null;
  onClose: () => void;
  onConfirm: (reason: string, notes?: string) => void | Promise<void>;
}

type Step = 'confirm' | 'form';

// ── Component ─────────────────────────────────────────────────────────────────
export function MarkLeadLostModal({ lead, onClose, onConfirm }: MarkLeadLostModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [selectedReason, setSelectedReason] = useState<string>('competitor_price');
  const [customReasonText, setCustomReasonText] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const isCustom = selectedReason === 'custom';
  const canSubmit = !isCustom || customReasonText.trim().length > 0;

  const handleClose = () => {
    setStep('confirm');
    setSelectedReason('competitor_price');
    setCustomReasonText('');
    setLossNotes('');
    setIsSubmitting(false);
    onClose();
  };

  const handleConfirmLost = async () => {
    if (isSubmitting || !canSubmit) return;
    setIsSubmitting(true);
    try {
      // If custom, use the typed text as the reason itself
      const finalReason = isCustom ? customReasonText.trim() : selectedReason;
      await onConfirm(finalReason, lossNotes.trim() || undefined);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0B1320] rounded-3xl border border-white/90 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-white/10 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Mark Lead as Lost</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-[260px]">
                {lead.name}
                {lead.city ? ` · ${lead.city}` : ''}
                {lead.value ? ` · $${lead.value.toLocaleString()}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Step 1: Confirm ── */}
        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Are you sure you want to mark{' '}
              <span className="font-black text-slate-900 dark:text-white">{lead.name}</span> as a{' '}
              <span className="text-rose-600 dark:text-rose-400 font-black">lost opportunity</span>? They'll be
              removed from the active pipeline.
            </p>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
              <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                You'll select a loss reason and add notes on the next screen. This lead can be
                reactivated at any time.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                Yes, Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Loss Reason Form ── */}
        {step === 'form' && (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Reason grid */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reason for Lost Opportunity
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(LOSS_REASONS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedReason(key)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedReason === key
                        ? 'bg-white dark:bg-rose-950/30 border-rose-400 dark:border-rose-500 shadow-2xs font-bold text-rose-900 dark:text-rose-200 ring-1 ring-rose-300/50 dark:ring-rose-800/50'
                        : 'bg-slate-50/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    } ${key === 'custom' ? 'col-span-2' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {key === 'custom' && selectedReason !== 'custom' && (
                        <PenLine size={11} className="ml-auto text-slate-400 shrink-0" />
                      )}
                    </div>
                    {selectedReason === key && key !== 'custom' && (
                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug font-normal">
                        {item.desc}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom reason input — appears when "Other / Custom" is selected */}
            {isCustom && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="block text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Custom Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="e.g. HOA restrictions prevented the project"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-rose-300 dark:border-rose-800/60 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 dark:focus:ring-rose-900/50 transition-all"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Loss Explanation Notes{' '}
                <span className="text-slate-400 font-medium normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={lossNotes}
                onChange={(e) => setLossNotes(e.target.value)}
                placeholder="e.g. Homeowner selected competitor who bid $3k lower on underlayment"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200/40 dark:focus:ring-rose-900/40 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) handleConfirmLost();
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLost}
                  disabled={isSubmitting || !canSubmit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  <CheckCircle2 size={13} className="stroke-[2.5]" />
                  <span>{isSubmitting ? 'Marking...' : 'Confirm Mark as Lost'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
