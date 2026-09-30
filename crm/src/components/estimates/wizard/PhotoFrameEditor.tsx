import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoAsset } from '@/types/estimateContractTypes';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move, 
  Upload, 
  Trash2, 
  Focus,
  Maximize2
} from 'lucide-react';
import { API_ORIGIN } from '@/lib/api';

const getImgSrc = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface PhotoFrameEditorProps {
  photo: PhotoAsset;
  onChange: (updated: PhotoAsset) => void;
  onRemove: () => void;
  onReplace?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReplacing?: boolean;
  label?: string;
  helperText?: string;
  aspectRatio?: number; // width / height, defaults to 816 / 526 ≈ 1.551
}

export function PhotoFrameEditor({
  photo,
  onChange,
  onRemove,
  onReplace,
  isReplacing = false,
  label = 'Estimate Photo Frame',
  helperText = 'Click and drag to reposition within the frame. Use the slider or mouse wheel to zoom.',
  aspectRatio = 816 / 526,
}: PhotoFrameEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Current values
  const currentX = photo.x ?? photo.position?.x ?? 0;
  const currentY = photo.y ?? photo.position?.y ?? 0;
  const currentZoom = Math.max(1, Math.min(3, photo.zoom ?? 1));

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // Update photo crop
  const updateCrop = useCallback((x: number, y: number, zoom: number) => {
    // Dynamic boundary limits based on zoom level (allows panning the extra zoomed/covered area)
    const maxBoundX = Math.max(25, (zoom - 0.7) * 45);
    const maxBoundY = Math.max(25, (zoom - 0.7) * 45);

    const clampedX = Math.round(Math.max(-maxBoundX, Math.min(maxBoundX, x)) * 10) / 10;
    const clampedY = Math.round(Math.max(-maxBoundY, Math.min(maxBoundY, y)) * 10) / 10;
    const clampedZoom = Math.round(Math.max(1, Math.min(3, zoom)) * 100) / 100;

    onChange({
      ...photo,
      x: clampedX,
      y: clampedY,
      zoom: clampedZoom,
      position: { x: clampedX, y: clampedY },
      // Also update legacy focalPoint (0 to 1 range)
      focalPoint: {
        x: Math.max(0, Math.min(1, 0.5 - (clampedX / 100))),
        y: Math.max(0, Math.min(1, 0.5 - (clampedY / 100))),
      }
    });
  }, [photo, onChange]);

  // Pointer Down (Drag Start)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Primary click only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: currentX,
      startY: currentY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Pointer Move (Dragging)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaPixelX = e.clientX - dragStartRef.current.x;
    const deltaPixelY = e.clientY - dragStartRef.current.y;

    // Convert pixels to container percentage
    const deltaPercentX = (deltaPixelX / rect.width) * 100;
    const deltaPercentY = (deltaPixelY / rect.height) * 100;

    const newX = dragStartRef.current.startX + deltaPercentX;
    const newY = dragStartRef.current.startY + deltaPercentY;

    updateCrop(newX, newY, currentZoom);
  };

  // Pointer Up / Cancel (Drag End)
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
  };

  // Wheel Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomStep = e.deltaY < 0 ? 0.08 : -0.08;
      const nextZoom = Math.max(1, Math.min(3, currentZoom + zoomStep));
      updateCrop(currentX, currentY, nextZoom);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [currentX, currentY, currentZoom, updateCrop]);

  // Zoom Button Controls
  const handleZoomIn = () => {
    updateCrop(currentX, currentY, Math.min(3, currentZoom + 0.15));
  };

  const handleZoomOut = () => {
    updateCrop(currentX, currentY, Math.max(1, currentZoom - 0.15));
  };

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateCrop(currentX, currentY, val);
  };

  const handleReset = () => {
    updateCrop(0, 0, 1.0);
  };

  const handleCenter = () => {
    updateCrop(0, 0, currentZoom);
  };

  return (
    <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Focus size={13} className="text-[#1878B8]" />
            {label}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {helperText}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onReplace && (
            <>
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                disabled={isReplacing}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-[#1878B8] hover:text-[#1878B8] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Upload a different photo"
              >
                <Upload size={12} />
                <span>Replace</span>
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={onReplace}
              />
            </>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title="Remove Photo"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ aspectRatio: `${aspectRatio}` }}
        className={`relative w-full max-h-[340px] rounded-xl overflow-hidden bg-slate-950 select-none touch-none transition-shadow ${
          isDragging
            ? 'cursor-grabbing ring-2 ring-[#1878B8] shadow-lg'
            : 'cursor-grab hover:ring-2 hover:ring-sky-400/60 shadow-md'
        }`}
      >
        {/* Rendered Image */}
        <img
          src={getImgSrc(photo.url)}
          alt="Framed Photo"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75 will-change-transform"
          style={{
            transform: `translate(${currentX}%, ${currentY}%) scale(${currentZoom})`,
            transformOrigin: 'center center',
          }}
        />

        {/* Rule-of-Thirds Alignment Grid (visible on drag or hover) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
            isDragging ? 'opacity-70' : 'opacity-25 hover:opacity-50'
          }`}
        >
          {/* Vertical grid lines */}
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/60 shadow-xs" />
          <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/60 shadow-xs" />
          {/* Horizontal grid lines */}
          <div className="absolute left-0 right-0 top-1/3 h-px bg-white/60 shadow-xs" />
          <div className="absolute left-0 right-0 top-2/3 h-px bg-white/60 shadow-xs" />
        </div>

        {/* Center Crosshair Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40 flex items-center justify-center">
          <div className="w-full h-0.5 bg-white/90 rounded-full" />
          <div className="absolute w-0.5 h-full bg-white/90 rounded-full" />
        </div>

        {/* Floating Controls Overlay Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-sm pointer-events-none">
          <Move size={11} className="text-[#38bdf8]" />
          <span>{isDragging ? 'Dragging…' : 'Drag to reposition'}</span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white shadow-sm pointer-events-none">
          <Maximize2 size={11} className="text-[#38bdf8]" />
          <span>{Math.round(currentZoom * 100)}%</span>
        </div>

        {/* Bottom Filename Tag */}
        {photo.filename && (
          <div className="absolute bottom-2 left-3 right-3 truncate text-[10px] font-medium text-white/80 bg-slate-950/50 backdrop-blur-xs px-2 py-0.5 rounded pointer-events-none">
            {photo.filename}
          </div>
        )}
      </div>

      {/* Zoom and Position Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Zoom Slider with - / + buttons */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={currentZoom <= 1.0}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.02"
              value={currentZoom}
              onChange={handleZoomSlider}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1878B8]"
            />
          </div>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={currentZoom >= 3.0}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 w-11 text-right">
            {Math.round(currentZoom * 100)}%
          </span>
        </div>

        {/* Position Reset & Center Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCenter}
            disabled={currentX === 0 && currentY === 0}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Re-center photo position without resetting zoom"
          >
            Center
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={currentX === 0 && currentY === 0 && currentZoom === 1.0}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
            title="Reset position and zoom to default"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
