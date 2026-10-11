import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Edit3, PenTool, RotateCcw, X } from 'lucide-react';
import type {
  CompanySignature,
  CompanySignatureType,
  CompanySignatureUpdatePayload,
} from '@/types/companySignatureTypes';
import {
  COMPANY_LEGAL_NAME,
  DEFAULT_SIGNER_NAME,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
} from './signatureFormat';

interface CompanySignatureEditorModalProps {
  isOpen: boolean;
  /** Current signature, or null on first setup. */
  current: CompanySignature | null;
  onClose: () => void;
  /** Persists the signature. Should throw (with `.status` / `.message`) on failure. */
  onSubmit: (payload: CompanySignatureUpdatePayload) => Promise<void>;
}

const INPUT_CLASS =
  'w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20';

const LABEL_CLASS = 'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1';

function describeSaveError(err: unknown): string {
  const e = err as { status?: number; message?: string } | null;
  if (e?.status === 409) {
    return (
      'Someone else changed the company signature while you were editing. ' +
      'Close this dialog to load the latest version, then try again.' +
      (e.message && !/status 409/.test(e.message) ? ` (${e.message})` : '')
    );
  }
  return e?.message || 'Failed to save the company signature. Please try again.';
}

export function CompanySignatureEditorModal({
  isOpen,
  current,
  onClose,
  onSubmit,
}: CompanySignatureEditorModalProps) {
  const isFirstSetup = !current;

  const [signerName, setSignerName] = useState<string>('');
  const [signerTitle, setSignerTitle] = useState<string>('');
  const [signMode, setSignMode] = useState<CompanySignatureType>('typed');
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Reset the form whenever the dialog opens. Deliberately NOT re-run when `current` changes while
  // open (e.g. the background refresh after a 409) so the user's input and the error stay visible.
  useEffect(() => {
    if (!isOpen) return;
    setSignerName(current?.signer_name || DEFAULT_SIGNER_NAME);
    setSignerTitle(current?.signer_title || '');
    setSignMode(current?.signature_type === 'drawn' ? 'drawn' : 'typed');
    setDrawnDataUrl(
      current?.signature_type === 'drawn' && current.signature_data?.startsWith('data:image')
        ? current.signature_data
        : null
    );
    setReason('');
    setError(null);
    setIsSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape to close + body scroll lock.
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

  // Prepare the drawing canvas (and paint the existing drawn signature, if any).
  useEffect(() => {
    if (!isOpen || signMode !== 'drawn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#091b36';
    ctx.lineWidth = 2.5;

    if (drawnDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = drawnDataUrl;
    }
    // Only re-initialise when the pad is (re)shown — not on every stroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, signMode]);

  const trimmedName = signerName.trim();
  const trimmedTitle = signerTitle.trim();
  const trimmedReason = reason.trim();
  const signatureData = signMode === 'typed' ? trimmedName : drawnDataUrl || '';

  const hasChanges = useMemo(() => {
    if (!current) return true;
    return (
      trimmedName !== (current.signer_name || '') ||
      trimmedTitle !== (current.signer_title || '') ||
      signMode !== current.signature_type ||
      signatureData !== (current.signature_data || '')
    );
  }, [current, trimmedName, trimmedTitle, signMode, signatureData]);

  const reasonValid =
    isFirstSetup || (trimmedReason.length >= REASON_MIN_LENGTH && trimmedReason.length <= REASON_MAX_LENGTH);

  const validationHint: string | null = !trimmedName
    ? 'Enter the signer’s legal name.'
    : !trimmedTitle
      ? 'Enter the signer’s title.'
      : !signatureData
        ? 'Draw the signature on the pad.'
        : !hasChanges
          ? 'Nothing has changed yet.'
          : !reasonValid
            ? `A reason for the change is required (at least ${REASON_MIN_LENGTH} characters).`
            : null;

  const canSave = !isSaving && validationHint === null;

  if (!isOpen) return null;

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) setDrawnDataUrl(canvas.toDataURL('image/png'));
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnDataUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        signer_name: trimmedName,
        signer_title: trimmedTitle,
        signature_type: signMode,
        signature_data: signatureData,
        ...(isFirstSetup ? {} : { reason: trimmedReason }),
        expected_version: current?.version ?? null,
      });
    } catch (err) {
      setError(describeSaveError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-signature-editor-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#0B1320] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <PenTool size={18} />
            </div>
            <div>
              <h3 id="company-signature-editor-title" className="text-sm font-bold text-slate-900 dark:text-white">
                {isFirstSetup ? 'Set up company signature' : 'Change company signature'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {COMPANY_LEGAL_NAME}
                {current ? ` • currently v${current.version}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label htmlFor="company-signer-name" className={LABEL_CLASS}>
                Signer name *
              </label>
              <input
                id="company-signer-name"
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Edith Guerrero"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="company-signer-title" className={LABEL_CLASS}>
                Signer title *
              </label>
              <input
                id="company-signer-title"
                type="text"
                required
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g. Owner, President, Authorized Officer"
                className={INPUT_CLASS}
              />
            </div>

            {/* Mode Selector */}
            <div>
              <span className={`${LABEL_CLASS} mb-1.5`}>Signature style</span>
              <div className="grid grid-cols-2 gap-2">
                {(['typed', 'drawn'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={signMode === mode}
                    onClick={() => setSignMode(mode)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      signMode === mode
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
                    }`}
                  >
                    {mode === 'drawn' && <Edit3 size={13} />}
                    <span>{mode === 'typed' ? 'Typed calligraphy' : 'Draw signature'}</span>
                  </button>
                ))}
              </div>
            </div>

            {signMode === 'typed' && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Preview:</span>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-4xl text-sky-950 dark:text-sky-200 select-none py-2 font-semibold tracking-wide italic font-serif">
                    {trimmedName || 'Signature'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-1 mt-1">
                    Rendered on the contract as electronic calligraphy
                  </div>
                </div>
              </div>
            )}

            {signMode === 'drawn' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Sign with mouse, finger or stylus:
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner touch-none relative">
                  <canvas
                    ref={canvasRef}
                    aria-label="Signature drawing pad"
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    className="w-full h-36 cursor-crosshair block bg-amber-50/20 dark:bg-slate-900/30"
                  />
                  <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 pointer-events-none">
                    &times; Draw signature along the line
                  </div>
                </div>
              </div>
            )}

            {!isFirstSetup && (
              <div>
                <label htmlFor="company-signature-reason" className={LABEL_CLASS}>
                  Reason for change *
                </label>
                <textarea
                  id="company-signature-reason"
                  required
                  rows={3}
                  maxLength={REASON_MAX_LENGTH}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Updated title after promotion / re-drew a cleaner signature"
                  className={`${INPUT_CLASS} resize-none`}
                />
                <div className="mt-1 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
                  <span>Saved permanently in the signature history.</span>
                  <span>
                    {trimmedReason.length}/{REASON_MAX_LENGTH}
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 text-[11px] text-purple-900 dark:text-purple-300 leading-relaxed">
              <strong>Legal notice:</strong> Under the California Uniform Electronic Transactions Act (UETA) and the
              federal ESIGN Act, this signature will be applied to contracts counter-signed by{' '}
              {COMPANY_LEGAL_NAME}. Every change is recorded with your name, the date and the reason.
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-2.5">
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 min-w-0">{validationHint ?? ''}</span>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>{isFirstSetup ? 'Save signature' : 'Save change'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
