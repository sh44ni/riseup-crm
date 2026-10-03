import React from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { QuoteSlide } from '@/lib/quoteBannerStore';

export interface QuoteBannerSlidesTabProps {
  slides: QuoteSlide[];
  previewSlideIdx: number;
  setPreviewSlideIdx: (idx: number) => void;
  onMoveSlide: (index: number, direction: 'up' | 'down') => void;
  onDeleteSlide: (index: number) => void;
}

export function QuoteBannerSlidesTab({
  slides,
  previewSlideIdx,
  setPreviewSlideIdx,
  onMoveSlide,
  onDeleteSlide,
}: QuoteBannerSlidesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Configured Carousel Slides</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Reorder slides, preview transitions, or remove images.
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#0284c7] dark:text-sky-400 font-bold">
          {slides.length} slides active
        </span>
      </div>

      <div className="space-y-2">
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
              idx === previewSlideIdx
                ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-400'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            {/* Thumbnail */}
            <div
              onClick={() => setPreviewSlideIdx(idx)}
              className="w-16 h-11 rounded-lg bg-cover bg-center border border-slate-200 dark:border-white/20 shrink-0 cursor-pointer hover:opacity-90"
              style={{ backgroundImage: `url('${slide.imageUrl}')` }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0" onClick={() => setPreviewSlideIdx(idx)}>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer">
                {slide.title || `Slide ${idx + 1}`}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                {slide.imageUrl}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onMoveSlide(idx, 'up')}
                disabled={idx === 0}
                title="Move Up"
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 disabled:opacity-30 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowUp size={12} />
              </button>

              <button
                type="button"
                onClick={() => onMoveSlide(idx, 'down')}
                disabled={idx === slides.length - 1}
                title="Move Down"
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 disabled:opacity-30 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowDown size={12} />
              </button>

              <button
                type="button"
                onClick={() => onDeleteSlide(idx)}
                disabled={slides.length <= 1}
                title="Delete Slide"
                className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 text-rose-500 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer ml-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
