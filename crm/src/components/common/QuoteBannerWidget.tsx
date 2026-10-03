import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuoteBanner } from '@/lib/quoteBannerStore';
import { QuoteBannerCustomizerModal } from './QuoteBannerCustomizerModal';

export interface QuoteBannerWidgetProps {
  className?: string;
}

export function QuoteBannerWidget({ className = '' }: QuoteBannerWidgetProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    config,
    currentSlideIndex,
    setCurrentSlideIndex,
    nextSlide,
    prevSlide,
    setIsHovered,
    updateConfig,
    resetConfig,
    isSaving,
  } = useQuoteBanner();

  const isSlideshow = config.mode === 'slideshow';
  const slides = config.slides?.length ? config.slides : [];
  const currentSlide = slides[currentSlideIndex] || slides[0];

  const activeImageUrl = isSlideshow ? currentSlide?.imageUrl || '' : config.singleImageUrl;

  const heightClasses = {
    compact: 'min-h-[105px] h-[105px]',
    balanced: 'min-h-[128px] h-[128px]',
    tall: 'min-h-[155px] h-[155px]',
  };

  const handleCardClick = () => {
    if (config.linkUrl && config.linkUrl.trim()) {
      const url = config.linkUrl.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(url);
      }
    }
  };

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
        className={`relative z-10 rounded-2xl overflow-hidden border border-white/85 dark:border-white/10 light-glass-panel glossy-sheen shadow-xs group/quote select-none transition-all duration-300 hover:border-sky-300 dark:hover:border-sky-500/30 ${
          config.linkUrl ? 'cursor-pointer' : ''
        } ${heightClasses[config.cardHeight || 'balanced']} ${className}`}
      >
        {/* ========================================================
            1. PURE CLEAN IMAGE (Zero Text & Zero Obscuring Overlay)
            ======================================================== */}
        <div
          className={`absolute inset-0 transition-all duration-700 ease-out group-hover/quote:scale-105 pointer-events-none ${
            config.imageFit === 'contain'
              ? 'bg-contain bg-center bg-no-repeat'
              : 'bg-cover bg-[position:65%_center]'
          }`}
          style={{
            backgroundImage: activeImageUrl ? `url('${activeImageUrl}')` : 'none',
            filter: 'brightness(1.02) saturate(1.08)',
          }}
        />

        {!activeImageUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="absolute inset-0 z-10 flex items-center justify-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#1878B8] dark:hover:text-sky-300 cursor-pointer"
          >
            Add banner image
          </button>
        )}

        {/* Tactile Edge Sheen (Subtle glass reflection preserving aesthetic without obscuring graphic) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10 pointer-events-none" />

        {/* ========================================================
            2. CUSTOMIZE PENCIL BUTTON (Revealed on hover in top-right)
            ======================================================== */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          aria-label="Customize Quote Banner"
          title="Customize Quote & Media Banner"
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-sky-500 text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center border border-white/80 dark:border-white/10 shadow-xs opacity-0 group-hover/quote:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 z-20"
        >
          <Pencil size={11} className="stroke-[2.5]" />
        </button>

        {/* ========================================================
            3. SLIDESHOW NAVIGATION CONTROLS (Only when in Slideshow mode)
            ======================================================== */}
        {isSlideshow && slides.length > 1 && (
          <>
            {/* Previous Slide Arrow (Hover Reveal) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Previous Slide"
              title="Previous Quote Image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white flex items-center justify-center border border-white/20 backdrop-blur-xs opacity-0 group-hover/quote:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 z-10"
            >
              <ChevronLeft size={13} className="stroke-[2.5]" />
            </button>

            {/* Next Slide Arrow (Hover Reveal) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Next Slide"
              title="Next Quote Image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white flex items-center justify-center border border-white/20 backdrop-blur-xs opacity-0 group-hover/quote:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 z-10"
            >
              <ChevronRight size={13} className="stroke-[2.5]" />
            </button>

            {/* Bottom Slide Dots Indicator */}
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex(idx);
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentSlideIndex
                      ? 'w-5 bg-white shadow-xs'
                      : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ========================================================
          4. CUSTOMIZER MODAL POPUP
          ======================================================== */}
      {isModalOpen && (
        <QuoteBannerCustomizerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentConfig={config}
          onSave={updateConfig}
          onReset={resetConfig}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
