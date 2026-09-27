import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, MoveRight, Loader2, ArrowRight, FileText, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cleanseAuthor, serializeProfileNote } from "@/lib/noteUtils";

export interface MoveModalCard {
  id: string;
  name: string;
  location?: string;
  service?: string;
  serviceColor?: string;
  time?: string;
  phone?: string;
  email?: string;
}

export interface MoveModalColumn {
  id: string;
  title: string;
  accentColor: string;
  pillClass?: string;
  count?: number;
  bgColor?: string;
  borderColor?: string;
  badgeClass?: string;
  iconType?: string;
  cards?: any[];
}

export interface MoveLeadModalProps {
  intent: { card: MoveModalCard; fromCol: MoveModalColumn; toCol: MoveModalColumn } | null;
  isMoving: boolean;
  onConfirm: (notes: string, authorInfo?: { plainNote?: string; authorName?: string; authorRole?: string }) => void;
  onCancel: () => void;
}

export function MoveLeadModal({ intent, isMoving, onConfirm, onCancel }: MoveLeadModalProps) {
  const { user } = useAuth();
  const clean = cleanseAuthor(user?.name, user?.role);
  const authorName = clean.name;
  const authorRole = clean.role || 'Owner';

  const [note, setNote] = useState("");
  const [confirmFlash, setConfirmFlash] = useState(false);
  const [cancelFlash, setCancelFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset note and auto-focus textarea when intent changes
  useEffect(() => {
    if (intent) {
      setNote("");
      setConfirmFlash(false);
      setCancelFlash(false);
      const t = setTimeout(() => textareaRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [intent?.card.id]);

  const handleConfirm = useCallback(() => {
    if (isMoving) return;
    setConfirmFlash(true);
    const plain = note.trim();
    const finalNote = plain
      ? serializeProfileNote(plain, authorName, authorRole)
      : "";
    setTimeout(() => {
      setConfirmFlash(false);
      onConfirm(finalNote, { plainNote: plain, authorName, authorRole });
    }, 120);
  }, [isMoving, note, onConfirm, authorName, authorRole]);

  const handleCancel = useCallback(() => {
    if (isMoving) return;
    setCancelFlash(true);
    setTimeout(() => { setCancelFlash(false); onCancel(); }, 100);
  }, [isMoving, onCancel]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!intent) return;
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleConfirm(); return; }
      if (e.key === "Escape") { e.preventDefault(); handleCancel(); return; }
      if (e.key === "Enter" && document.activeElement !== textareaRef.current) { e.preventDefault(); handleConfirm(); return; }
      if (e.key === "Backspace") {
        const focused = document.activeElement === textareaRef.current;
        if (!focused || note === "") { e.preventDefault(); handleCancel(); }
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [intent, note, handleConfirm, handleCancel]);

  if (!intent) return null;
  const { card, fromCol, toCol } = intent;

  return createPortal(
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Ambient caustic light blobs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-sky-400/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-80 h-80 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[26px] bg-white/94 dark:bg-[#0B1320]/95 backdrop-blur-3xl border border-white/95 dark:border-white/12 shadow-[0_25px_90px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_90px_rgba(0,0,0,0.85)] overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100"
      >
        {/* Specular top highlight bevel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* Thin accent bar top — gradient from→to */}
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(to right, ${fromCol.accentColor}, ${toCol.accentColor})` }}
        />

        {/* Header */}
        <div className="px-6 pt-5 pb-3.5 border-b border-slate-200/75 dark:border-white/10 flex items-start justify-between gap-4 bg-white/40 dark:bg-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Move Lead</h2>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-[#0284c7] dark:text-sky-300 border border-sky-300/70 dark:border-sky-500/30 shadow-2xs">
                Pipeline Stage
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Reassign to a different pipeline column</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Lead identity card */}
          <div className="rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 px-4 py-3.5 flex items-start gap-3 shadow-2xs">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-[13px] text-white shadow-xs"
              style={{ background: `linear-gradient(135deg, ${fromCol.accentColor}, ${toCol.accentColor})` }}
            >
              {card.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-black text-[14px] text-slate-900 dark:text-white leading-snug">{card.name}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <MapPin size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{card.location}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{card.service}</span>
              </div>
            </div>
          </div>

          {/* Stage transition */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Stage Transition</span>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-white/15 dark:via-white/5 dark:to-transparent flex-1" />
            </div>
            <div className="flex items-center gap-2">
              {/* From pill */}
              <div
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-[10.5px] font-black truncate ${fromCol.pillClass || 'text-white shadow-xs'}`}
                style={!fromCol.pillClass ? { backgroundColor: fromCol.accentColor } : undefined}
              >
                <span className="truncate">{fromCol.title}</span>
              </div>
              {/* Animated arrow */}
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <ArrowRight
                  size={18}
                  className="text-slate-400"
                  style={{ animation: "mlArrow 1.3s ease-in-out infinite" }}
                />
              </div>
              {/* To pill */}
              <div
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-[10.5px] font-black truncate ${toCol.pillClass || 'text-white shadow-xs'}`}
                style={!toCol.pillClass ? { backgroundColor: toCol.accentColor } : undefined}
              >
                <span className="truncate">{toCol.title}</span>
              </div>
            </div>
          </div>

          {/* Note section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Move Note <span className="text-[9px] font-semibold normal-case text-slate-400 dark:text-slate-500">(optional)</span>
              </span>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-white/15 dark:via-white/5 dark:to-transparent flex-1" />
            </div>

            <div className="relative group">
              <FileText size={13} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-[#1878B8] dark:group-focus-within:text-sky-400 transition-colors pointer-events-none" />
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Client confirmed follow-up for Tuesday..."
                rows={3}
                disabled={isMoving}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs resize-y disabled:opacity-50"
                style={{ minHeight: "72px", maxHeight: "160px", fontFamily: "inherit" }}
              />
            </div>
            {/* Keyboard hints */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[8.5px] text-slate-600 dark:text-slate-300 shadow-2xs">⌘↵</kbd>
                confirm
              </span>
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[8.5px] text-slate-600 dark:text-slate-300 shadow-2xs">⌫</kbd>
                cancel if empty
              </span>
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[8.5px] text-slate-600 dark:text-slate-300 shadow-2xs">Esc</kbd>
                cancel
              </span>
            </div>
          </div>

          {/* Action buttons — matches CRM submit row style */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isMoving}
              className={`flex-1 py-2.5 rounded-2xl text-[12px] font-bold transition-all border ${
                cancelFlash
                  ? "bg-rose-50 text-rose-700 border-rose-300"
                  : "bg-slate-100/90 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border-slate-200/80 dark:border-white/10"
              } disabled:opacity-50 cursor-pointer shadow-2xs`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isMoving}
              className={`flex-[2] py-2.5 rounded-2xl text-[12px] font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60 ${
                confirmFlash ? "scale-[0.98]" : "hover:brightness-110 active:scale-[0.98]"
              }`}
              style={{
                background: isMoving
                  ? "rgba(148,163,184,0.5)"
                  : `linear-gradient(135deg, ${fromCol.accentColor} 0%, ${toCol.accentColor} 100%)`,
                color: "white",
                boxShadow: isMoving ? "none" : `0 6px 20px -4px ${toCol.accentColor}60`,
              }}
            >
              {isMoving ? (
                <><Loader2 size={13} className="animate-spin" /><span>Moving...</span></>
              ) : (
                <><MoveRight size={13} /><span>Confirm Move</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mlArrow {
          0%,100% { transform: translateX(0); opacity: 0.8; }
          50%      { transform: translateX(5px); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
