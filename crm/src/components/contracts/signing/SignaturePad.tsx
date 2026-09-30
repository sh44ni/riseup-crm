import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Type, RotateCcw, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  initialName?: string;
  onChange: (result: {
    signatureName: string;
    signatureType: 'typed' | 'drawn';
    signatureData: string;
    isValid: boolean;
  }) => void;
}

export function SignaturePad({ initialName = '', onChange }: SignaturePadProps) {
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed');
  const [typedName, setTypedName] = useState(initialName);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // Initialize typed signature
  useEffect(() => {
    if (mode === 'typed') {
      const valid = typedName.trim().length >= 2;
      onChange({
        signatureName: typedName.trim(),
        signatureType: 'typed',
        signatureData: typedName.trim(),
        isValid: valid,
      });
    }
  }, [typedName, mode]);

  // Canvas drawing handlers
  useEffect(() => {
    if (mode !== 'drawn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#091b36';
    ctx.lineWidth = 2.5;
  }, [mode]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);

    const dataUrl = canvas.toDataURL('image/png');
    onChange({
      signatureName: typedName.trim() || initialName || '',
      signatureType: 'drawn',
      signatureData: dataUrl,
      isValid: true,
    });
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange({
      signatureName: typedName.trim() || initialName,
      signatureType: 'drawn',
      signatureData: '',
      isValid: false,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Electronic Signature Method
        </label>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMode('typed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'typed'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type size={14} /> Type Name
          </button>
          <button
            type="button"
            onClick={() => setMode('drawn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'drawn'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool size={14} /> Draw Signature
          </button>
        </div>
      </div>

      {mode === 'typed' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type Your Full Legal Name
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full legal name"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-800 focus:outline-none focus:border-[#1a5ba5] transition-all"
            />
          </div>

          {typedName.trim().length >= 2 && (
            <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 mb-1">
                Official Signature Preview:
              </div>
              <div
                className="text-3xl text-[#091b36] py-2 px-1 select-none"
                style={{ fontFamily: "'Caveat', cursive, serif" }}
              >
                {typedName}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Sign with your finger, mouse, or stylus:</span>
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold text-xs cursor-pointer transition-colors"
            >
              <RotateCcw size={13} /> Clear
            </button>
          </div>

          <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden touch-none h-44 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-full cursor-crosshair"
            />
            {!hasDrawn && (
              <div className="absolute pointer-events-none text-slate-400 text-sm font-medium flex items-center gap-2">
                <PenTool size={16} /> Sign here
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
        <span>
          Legally binding under the California Uniform Electronic Transactions Act (Civil Code § 1633.1 et seq.).
        </span>
      </div>
    </div>
  );
}

export default SignaturePad;
