import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Layers,
  Clock,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Play,
  Pause,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import {
  QuoteBannerConfig,
  QuoteSlide,
  DEFAULT_QUOTE_BANNER_CONFIG,
} from '@/lib/quoteBannerStore';
import { uploadQuoteBannerImage } from '@/api/quoteBannerApi';

export interface QuoteBannerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: QuoteBannerConfig;
  onSave: (newConfig: QuoteBannerConfig) => void;
  onReset: () => void;
}

const PRESET_IMAGES = [
  {
    title: 'Rise Up Rig & Villa',
    subtitle: 'Executive Fleet Backdrop',
    url: '/hero-bg.jpg',
  },
  {
    title: 'Coastal Roofing Horizon',
    subtitle: 'Oceanside Panoramic',
    url: '/sidebar-coastal-card.jpg',
  },
  {
    title: 'Master Craftsmanship',
    subtitle: 'Precision Shingle Installation',
    url: '/images/services/residential-roofing.jpg',
  },
  {
    title: 'Solar Tile Roofing',
    subtitle: 'Clean Energy & Modern Architecture',
    url: '/images/services/solar-roofing.jpg',
  },
  {
    title: 'Spanish Architectural Tile',
    subtitle: 'Classic Coastal Tilework',
    url: '/images/services/tile-roofing.jpg',
  },
  {
    title: 'Custom Construction',
    subtitle: 'Commercial & Residential Build',
    url: '/images/services/construction.jpg',
  },
];

export function QuoteBannerCustomizerModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  onReset,
}: QuoteBannerCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'mode' | 'slides' | 'settings'>('mode');

  // Working state
  const [mode, setMode] = useState<'single' | 'slideshow'>(currentConfig.mode || 'single');
  const [singleImageUrl, setSingleImageUrl] = useState<string>(currentConfig.singleImageUrl || '/hero-bg.jpg');
  const [slides, setSlides] = useState<QuoteSlide[]>(
    currentConfig.slides?.length ? currentConfig.slides : DEFAULT_QUOTE_BANNER_CONFIG.slides
  );
  const [autoplay, setAutoplay] = useState<boolean>(currentConfig.autoplay ?? true);
  const [slideDuration, setSlideDuration] = useState<number>(currentConfig.slideDuration || 5);
  const [transitionEffect, setTransitionEffect] = useState<'fade' | 'slide'>(
    currentConfig.transitionEffect || 'fade'
  );
  const [cardHeight, setCardHeight] = useState<'compact' | 'balanced' | 'tall'>(
    currentConfig.cardHeight || 'balanced'
  );
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>(
    currentConfig.imageFit || 'cover'
  );
  const [linkUrl, setLinkUrl] = useState<string>(currentConfig.linkUrl || '');

  // Preview interactive state
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active preview image
  const activePreviewImage =
    mode === 'single'
      ? singleImageUrl
      : slides[previewSlideIdx]?.imageUrl || singleImageUrl;

  const heightClasses = {
    compact: 'min-h-[105px] h-[105px]',
    balanced: 'min-h-[128px] h-[128px]',
    tall: 'min-h-[155px] h-[155px]',
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const result = await uploadQuoteBannerImage(file);
    setIsUploading(false);

    if (result.success && result.url) {
      if (mode === 'single') {
        setSingleImageUrl(result.url);
      } else {
        const newSlide: QuoteSlide = {
          id: `slide-${Date.now()}`,
          imageUrl: result.url,
          title: file.name.replace(/\.[^/.]+$/, ''),
        };
        setSlides((prev) => [...prev, newSlide]);
        setPreviewSlideIdx(slides.length);
      }
    }
  };

  // Add custom URL
  const handleAddUrl = () => {
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();

    if (mode === 'single') {
      setSingleImageUrl(url);
    } else {
      const newSlide: QuoteSlide = {
        id: `slide-${Date.now()}`,
        imageUrl: url,
        title: `Slide ${slides.length + 1}`,
      };
      setSlides((prev) => [...prev, newSlide]);
      setPreviewSlideIdx(slides.length);
    }
    setCustomUrlInput('');
  };

  // Move slide up/down
  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIdx, 0, moved);
    setSlides(newSlides);
    setPreviewSlideIdx(targetIdx);
  };

  // Delete slide
  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return; // Keep at least one slide
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (previewSlideIdx >= newSlides.length) {
      setPreviewSlideIdx(newSlides.length - 1);
    }
  };

  // Add preset as slide or single
  const selectPreset = (url: string, title: string) => {
    if (mode === 'single') {
      setSingleImageUrl(url);
    } else {
      const newSlide: QuoteSlide = {
        id: `slide-${Date.now()}`,
        imageUrl: url,
        title,
      };
      setSlides((prev) => [...prev, newSlide]);
      setPreviewSlideIdx(slides.length);
    }
  };

  const handleSave = () => {
    onSave({
      mode,
      singleImageUrl,
      slides,
      autoplay,
      slideDuration,
      transitionEffect,
      cardHeight,
      imageFit,
      linkUrl,
    });
    onClose();
  };

  const handleResetToDefault = () => {
    onReset();
    setMode(DEFAULT_QUOTE_BANNER_CONFIG.mode);
    setSingleImageUrl(DEFAULT_QUOTE_BANNER_CONFIG.singleImageUrl);
    setSlides(DEFAULT_QUOTE_BANNER_CONFIG.slides);
    setAutoplay(DEFAULT_QUOTE_BANNER_CONFIG.autoplay);
    setSlideDuration(DEFAULT_QUOTE_BANNER_CONFIG.slideDuration);
    setTransitionEffect(DEFAULT_QUOTE_BANNER_CONFIG.transitionEffect);
    setCardHeight(DEFAULT_QUOTE_BANNER_CONFIG.cardHeight);
    setImageFit(DEFAULT_QUOTE_BANNER_CONFIG.imageFit);
    setLinkUrl('');
    setPreviewSlideIdx(0);
  };

  // Lock body scroll and handle Escape key for modal
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

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0B0F17] border border-slate-200/80 dark:border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] my-auto flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200"
      >
        {/* ========================================================
            HEADER
            ======================================================== */}
        <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-gradient-to-r dark:from-sky-950/40 dark:to-slate-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-xs shrink-0">
              <ImageIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                  Quote & Media Banner Customizer
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 uppercase tracking-wider">
                  Clean Image Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Display a full-bleed quote graphic as a single image or an auto-advancing slideshow.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================
            LIVE INTERACTIVE PREVIEW CARD
            ======================================================== */}
        <div className="p-6 bg-slate-100/70 dark:bg-[#060910] border-b border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500 dark:text-amber-400" />
              <span>Live Card Preview</span>
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
              <span>Mode: {mode === 'slideshow' ? `Slideshow (${slides.length} slides)` : 'Single Image'}</span>
              <span>•</span>
              <span className="capitalize">{cardHeight} Height</span>
            </span>
          </div>

          {/* Rendered Preview Banner (Image-Only, Zero Text Overlay) */}
          <div
            className={`relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm max-w-sm mx-auto bg-slate-900 select-none group/preview ${heightClasses[cardHeight]} transition-all duration-300`}
          >
            {/* The Full-Bleed Graphic Image */}
            <div
              className={`w-full h-full transition-all duration-500 ${
                imageFit === 'contain' ? 'bg-contain bg-center bg-no-repeat' : 'bg-cover bg-[position:65%_center]'
              }`}
              style={{
                backgroundImage: `url('${activePreviewImage}')`,
              }}
            />

            {/* Subtle Glossy Corner Highlights (Preserves tactile glass feel without obscuring art) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10 pointer-events-none" />

            {/* Top Right: Status Badge in Preview */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              {mode === 'slideshow' && (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/20">
                  {previewSlideIdx + 1} / {slides.length}
                </span>
              )}
            </div>

            {/* Bottom: Slideshow Navigation Dots (Only in slideshow mode) */}
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

        {/* ========================================================
            TABS NAVIGATION
            ======================================================== */}
        <div className="flex border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#070A10] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('mode')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'mode'
                ? 'border-[#0284c7] text-[#0284c7] dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={14} />
            <span>Mode & Preset Library</span>
          </button>

          {mode === 'slideshow' && (
            <button
              type="button"
              onClick={() => setActiveTab('slides')}
              className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'slides'
                  ? 'border-[#0284c7] text-[#0284c7] dark:border-sky-400 dark:text-sky-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon size={14} />
              <span>Slides Manager ({slides.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#0284c7] text-[#0284c7] dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>Presentation & Layout</span>
          </button>
        </div>

        {/* ========================================================
            TAB CONTENT (SCROLLABLE)
            ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white/50 dark:bg-transparent">
          {/* TAB 1: MODE & PRESETS */}
          {activeTab === 'mode' && (
            <div className="space-y-6">
              {/* Display Mode Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Presentation Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('single')}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                      mode === 'single'
                        ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400/80 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-sky-400/20 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Single Image</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Fixed quote graphic banner</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('slideshow')}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                      mode === 'slideshow'
                        ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400/80 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-sky-400/20 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Slideshow Carousel</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Rotating multi-image banner</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload or Custom URL Input */}
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{mode === 'single' ? 'Upload Custom Image' : 'Add New Slide Image'}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">PNG, JPG, WebP</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL (https://...)"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284c7] dark:focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    disabled={!customUrlInput.trim()}
                    className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    {mode === 'single' ? 'Apply URL' : 'Add to Slides'}
                  </button>
                </div>

                <div className="flex items-center justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload size={14} className="text-sky-500 dark:text-sky-400" />
                    <span>{isUploading ? 'Processing File...' : 'Upload Image File from Computer'}</span>
                  </button>
                </div>
              </div>

              {/* Curated Preset Library */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Curated Presets Library
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_IMAGES.map((preset, idx) => {
                    const isSelected =
                      mode === 'single'
                        ? singleImageUrl === preset.url
                        : slides.some((s) => s.imageUrl === preset.url);

                    return (
                      <div
                        key={idx}
                        onClick={() => selectPreset(preset.url, preset.title)}
                        className={`relative rounded-xl overflow-hidden border p-2 flex flex-col justify-end min-h-[90px] cursor-pointer group transition-all ${
                          isSelected
                            ? 'border-sky-400 ring-2 ring-sky-400/30'
                            : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                        }`}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('${preset.url}')` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="relative z-10">
                          <div className="text-[11px] font-bold text-white leading-tight truncate">
                            {preset.title}
                          </div>
                          <div className="text-[9px] text-slate-300 truncate">
                            {preset.subtitle}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                            <Check size={10} className="stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SLIDES MANAGER (Only available when mode === 'slideshow') */}
          {activeTab === 'slides' && mode === 'slideshow' && (
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
                        onClick={() => moveSlide(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 disabled:opacity-30 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ArrowUp size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveSlide(idx, 'down')}
                        disabled={idx === slides.length - 1}
                        title="Move Down"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 disabled:opacity-30 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ArrowDown size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteSlide(idx)}
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
          )}

          {/* TAB 3: PRESENTATION & TIMING */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Card Height */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Sidebar Banner Height
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'compact', name: 'Compact', desc: '105px height' },
                    { id: 'balanced', name: 'Balanced', desc: '128px standard' },
                    { id: 'tall', name: 'Tall', desc: '155px extended' },
                  ].map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setCardHeight(h.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        cardHeight === h.id
                          ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{h.name}</div>
                      <div className="text-[10px] text-slate-500">{h.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Fit Mode */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Image Fit Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setImageFit('cover')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      imageFit === 'cover'
                        ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold">Cover (Full Bleed)</div>
                    <div className="text-[10px] text-slate-500">Fills container edge-to-edge</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageFit('contain')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      imageFit === 'contain'
                        ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold">Contain (Full Aspect)</div>
                    <div className="text-[10px] text-slate-500">Displays complete image without cropping</div>
                  </button>
                </div>
              </div>

              {/* Slideshow Specific Settings */}
              {mode === 'slideshow' && (
                <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Autoplay Slides</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automatically advance slides on an interval (pauses on hover)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoplay((prev) => !prev)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        autoplay ? 'bg-sky-500' : 'bg-slate-400 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          autoplay ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {autoplay && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Slide Display Duration</span>
                        <span className="font-mono text-[#0284c7] dark:text-sky-400 font-bold">{slideDuration} seconds</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="15"
                        step="1"
                        value={slideDuration}
                        onChange={(e) => setSlideDuration(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Slide Transition Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTransitionEffect('fade')}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          transitionEffect === 'fade'
                            ? 'bg-sky-500/20 border-sky-400 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Smooth Fade
                      </button>

                      <button
                        type="button"
                        onClick={() => setTransitionEffect('slide')}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          transitionEffect === 'slide'
                            ? 'bg-sky-500/20 border-sky-400 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Horizontal Slide
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Click-Through URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Optional Click Destination URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. /pipeline, /tasks, or external https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284c7] dark:focus:border-sky-400"
                  />
                  {linkUrl && (
                    <button
                      type="button"
                      onClick={() => setLinkUrl('')}
                      className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave blank if the card should not trigger page navigation when clicked.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            FOOTER ACTIONS
            ======================================================== */}
        <div className="p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#070A10] flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Check size={14} className="stroke-[2.5]" />
              <span>Save & Apply Banner</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
