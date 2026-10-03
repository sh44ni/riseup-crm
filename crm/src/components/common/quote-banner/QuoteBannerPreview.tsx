import React from 'react';
import { Sparkles } from 'lucide-react';
import { QuoteSlide } from '@/lib/quoteBannerStore';

export interface QuoteBannerPreviewProps {
  mode: 'single' | 'slideshow';
  slides: QuoteSlide[];
  cardHeight: 'compact' | 'balanced' | 'tall';
  imageFit: 'cover' | 'contain';
  activePreviewImage: string;
  previewSlideIdx: number;
  setPreviewSlideIdx: (idx: number) => void;
}

const heightClasses = {
  compact: 'min-h-[105px] h-[105px]',
  balanced: 'min-h-[128px] h-[128px]',
  tall: 'min-h-[155px] h-[155px]',
};

export function QuoteBannerPreview({
  mode,
  slides,
  cardHeight,
  imageFit,
  activePreviewImage,
  previewSlideIdx,
  setPreviewSlideIdx,
}: QuoteBannerPreviewProps) {
  return (
    <div className="p-6 bg-slate-100/70 dark:bg-[#060910] border-b border-slate-200/80 dark:border-white/10">
      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500 dark:text-amber-400" />
          <span>Live Card Preview</span>
        </span>
        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
          <span>Mode: {mode === 'slideshow' ? `Slideshow (${slides.length} slides)` : 'Single Image'}</span>
          <span>&bull;</span>
          <span className="capitalize">{cardHeight} Height</span>
        </span>
      </div>

      {/* Rendered Preview Banner */}
      <div
        className={`relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm max-w-sm mx-auto bg-slate-900 select-none group/preview ${heightClasses[cardHeight]} transition-all duration-300`}
      >
        <div
          className={`w-full h-full transition-all duration-500 ${
            imageFit === 'contain' ? 'bg-contain bg-center bg-no-repeat' : 'bg-cover bg-[position:65%_center]'
          }`}
          style={{
            backgroundImage: `url('${activePreviewImage}')`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10 pointer-events-none" />

        {mode === 'slideshow' && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/20">
              {previewSlideIdx + 1} / {slides.length}
            </span>
          </div>
        )}

        {mode === 'slideshow' && slides.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPreviewSlideIdx(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === previewSlideIdx
                    ? 'w-5 bg-white shadow-xs'
                    : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
