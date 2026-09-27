import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  X,
  FileText,
  MapPin,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';

export interface CompleteJobModalProps {
  isOpen: boolean;
  deal: {
    id: string;
    name: string;
    value?: number;
    service?: string;
    location?: string;
    address?: string;
    assignedToName?: string | null;
    createdByName?: string | null;
  } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (note: string, authorInfo?: { name: string; role: string }) => Promise<void>;
}

export function CompleteJobModal({
  isOpen,
  deal,
  isSubmitting,
  onClose,
  onConfirm,
}: CompleteJobModalProps) {
  const { user } = useAuth();
  const clean = cleanseAuthor(user?.name, user?.role);
  const authorName = clean?.name || user?.name || 'Staff Member';
  const authorRole = clean?.role || user?.role || 'Owner';

  const [note, setNote] = useState('');
  const [confirmFlash, setConfirmFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset note and auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && deal) {
      setNote('');
      setConfirmFlash(false);
      const t = setTimeout(() => {
        try {
          textareaRef.current?.focus();
        } catch {}
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, deal?.id]);

  const handleConfirm = useCallback(() => {
    if (isSubmitting || !deal) return;
    setConfirmFlash(true);
    const plain = note.trim();
    const finalNote = plain
      ? serializeProfileNote(plain, authorName, authorRole)
      : '';
    setTimeout(async () => {
      setConfirmFlash(false);
      await onConfirm(finalNote, { name: authorName, role: authorRole });
    }, 100);
  }, [isSubmitting, deal, note, onConfirm, authorName, authorRole]);

  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  // Keyboard shortcuts: Escape to cancel, Cmd+Enter to confirm
  useEffect(() => {
    if (!isOpen || !deal) return;
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [isOpen, deal, handleConfirm, handleCancel]);

  if (!isOpen || !deal) return null;

  const leadName = String(deal.name || 'Roofing Client');
  const initialLetter = leadName.charAt(0).toUpperCase() || 'R';
  const locationText = String(deal.address || deal.location || 'Oceanside, CA');
  const serviceText = String(deal.service || 'Residential Roofing');
  const formattedValue =
    typeof deal.value === 'number' && !isNaN(deal.value) && deal.value > 0
      ? `$${Math.round(deal.value).toLocaleString()}`
      : '$15,000';

  return createPortal(
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Ambient caustic light blobs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-emerald-400/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-80 h-80 bg-teal-400/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[26px] bg-white/94 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/12 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100"
      >
        {/* Specular top highlight bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* Emerald to Teal top accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Header */}
        <div className="px-6 pt-5 pb-3.5 border-b border-slate-200/75 dark:border-white/10 flex items-start justify-between gap-4 bg-white/40 dark:bg-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Complete Job</h2>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-500/30 shadow-2xs">
                Revenue Realised
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Certify project completion & realise contract revenue</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Lead identity card */}
          <div className="rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 px-4 py-3.5 flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-[13px] text-white shadow-xs bg-gradient-to-tr from-emerald-600 to-teal-500">
              {initialLetter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-black text-[14px] text-slate-900 dark:text-white leading-snug truncate">{leadName}</div>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-500/30 shrink-0">
                  {formattedValue}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                <MapPin size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{locationText}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{serviceText}</span>
              </div>
            </div>
          </div>

          {/* Staff Attribution Pill */}
          <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-3.5 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck size={13} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-900 dark:text-emerald-200 font-medium">
                Completed by: <strong className="font-black text-emerald-950 dark:text-white">{authorName}</strong> ({authorRole})
              </span>
            </div>
            <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-white/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
              Leaderboard
            </span>
          </div>

          {/* Note section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completion Note <span className="text-[9px] font-semibold normal-case text-slate-400 dark:text-slate-500">(recorded in Client 360)</span>
              </span>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-white/15 dark:via-white/5 dark:to-transparent flex-1" />
            </div>

            <div className="relative group">
              <FileText size={13} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add final inspection notes, warranty details, or walkthrough sign-off..."
                rows={3}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-3 focus:ring-emerald-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs resize-y disabled:opacity-50"
                style={{ minHeight: '76px', maxHeight: '160px', fontFamily: 'inherit' }}
              />
            </div>

            {/* Keyboard hints */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[8.5px] text-slate-600 dark:text-slate-300 shadow-2xs">⌘↵</kbd>
                confirm
              </span>
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[8.5px] text-slate-600 dark:text-slate-300 shadow-2xs">Esc</kbd>
                cancel
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-2xl text-[12px] font-bold transition-all border bg-slate-100/90 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border-slate-200/80 dark:border-white/10 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`flex-[2] py-2.5 rounded-2xl text-[12px] font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60 ${
                confirmFlash ? 'scale-[0.98]' : 'hover:brightness-110 active:scale-[0.98]'
              } bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-[0_6px_20px_-4px_rgba(5,150,105,0.45)]`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Completing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="stroke-[2.5]" />
                  <span>Complete Job & Add to 360</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CompleteJobModal;
