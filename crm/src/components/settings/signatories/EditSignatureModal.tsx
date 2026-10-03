import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Edit3,
  PenTool,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { SignatoryUser } from './types';

interface EditSignatureModalProps {
  editingSignatory: SignatoryUser | null;
  onClose: () => void;
  onSave: (
    id: number,
    name: string,
    title: string,
    type: 'typed' | 'drawn',
    data: string
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function EditSignatureModal({
  editingSignatory,
  onClose,
  onSave,
  onDelete,
}: EditSignatureModalProps) {
  const { toast } = useToast();
  const [signName, setSignName] = useState<string>('');
  const [signTitle, setSignTitle] = useState<string>('Project Manager');
  const [signMode, setSignMode] = useState<'typed' | 'drawn'>('typed');
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!editingSignatory) return;
    setSignName(editingSignatory.name || '');
    setSignTitle(editingSignatory.signature_title || 'Project Manager');
    setSignMode(editingSignatory.signature_type || 'typed');
    setDrawnDataUrl(
      editingSignatory.signature_data && editingSignatory.signature_data.startsWith('data:image')
        ? editingSignatory.signature_data
        : null
    );

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
  }, [editingSignatory, onClose]);

  useEffect(() => {
    if (!editingSignatory || signMode !== 'drawn') return;
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
  }, [editingSignatory, signMode]);

  if (!editingSignatory) return null;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnDataUrl(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalSigData = '';
    if (signMode === 'typed') {
      if (!signName.trim()) {
        toast.warning('Please enter the legal printed name for the calligraphy signature.');
        return;
      }
      finalSigData = signName.trim();
    } else {
      if (!drawnDataUrl) {
        toast.warning('Please draw a valid electronic signature on the canvas pad before saving.');
        return;
      }
      finalSigData = drawnDataUrl;
    }

    setIsSaving(true);
    try {
      await onSave(
        editingSignatory.id,
        signName.trim(),
        signTitle.trim() || 'Project Manager',
        signMode,
        finalSigData
      );
      onClose();
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Configure Official Signatory Signature
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingSignatory.name} &bull; {editingSignatory.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body & Sticky Footer */}
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Legal Printed Name *
              </label>
              <input
                type="text"
                required
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
                placeholder="e.g. Edith Guerrero"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Official Corporate Title *
              </label>
              <input
                type="text"
                required
                value={signTitle}
                onChange={(e) => setSignTitle(e.target.value)}
                placeholder="e.g. Project Manager, President, Authorized Officer"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
              />
            </div>

            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Signature Style Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSignMode('typed')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                    signMode === 'typed'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
                  }`}
                >
                  <span>Typed Calligraphy</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSignMode('drawn')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                    signMode === 'drawn'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Draw Electronic Signature</span>
                </button>
              </div>
            </div>

            {/* Typed Calligraphy Preview */}
            {signMode === 'typed' && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  Calligraphy Preview:
                </span>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-white/10 text-center">
                  <div
                    className="text-4xl text-sky-950 dark:text-sky-200 select-none py-2 font-semibold tracking-wide italic font-serif"
                  >
                    {signName || 'Your Signature'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-1 mt-1">
                    Rendered on Contract Page 4 as official electronic calligraphy
                  </div>
                </div>
              </div>
            )}

            {/* Hand-Drawn Canvas Pad */}
            {signMode === 'drawn' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Sign with mouse or stylus:
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Clear Canvas</span>
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner touch-none relative">
                  <canvas
                    ref={canvasRef}
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

            {/* Legal Notice */}
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 text-[11px] text-purple-900 dark:text-purple-300 leading-relaxed">
              <strong>Legal Notice:</strong> In accordance with the California Uniform Electronic Transactions Act (UETA) and federal ESIGN regulations, this official signature will be affixed to binding contracts executed by Rise Up Roofing and Construction, Inc. (License #1096492).
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-2.5">
            {editingSignatory.has_signature ? (
              <button
                type="button"
                onClick={() => onDelete(editingSignatory.id)}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Remove Signature</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
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
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Signature...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Save Authorized Signature</span>
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
