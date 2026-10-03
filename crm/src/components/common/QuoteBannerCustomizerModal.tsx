import React, { useState, useRef } from 'react';
import {
  Sliders,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import {
  QuoteBannerConfig,
  QuoteSlide,
  DEFAULT_QUOTE_BANNER_CONFIG,
} from '@/lib/quoteBannerStore';
import { uploadQuoteBannerImage } from '@/api/quoteBannerApi';
import { CustomizerShell } from './CustomizerShell';
import { QuoteBannerPreview } from './quote-banner/QuoteBannerPreview';
import { QuoteBannerModeTab, PresetQuoteImage } from './quote-banner/QuoteBannerModeTab';
import { QuoteBannerSlidesTab } from './quote-banner/QuoteBannerSlidesTab';
import { QuoteBannerSettingsTab } from './quote-banner/QuoteBannerSettingsTab';

export interface QuoteBannerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: QuoteBannerConfig;
  onSave: (newConfig: QuoteBannerConfig) => void;
  onReset: () => void;
}

const PRESET_IMAGES: PresetQuoteImage[] = [
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

  const activePreviewImage =
    mode === 'single'
      ? singleImageUrl
      : slides[previewSlideIdx]?.imageUrl || singleImageUrl;

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

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIdx, 0, moved);
    setSlides(newSlides);
    setPreviewSlideIdx(targetIdx);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (previewSlideIdx >= newSlides.length) {
      setPreviewSlideIdx(newSlides.length - 1);
    }
  };

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

  const badge = (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 uppercase tracking-wider">
      Clean Image Only
    </span>
  );

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<ImageIcon size={20} />}
      title="Quote & Media Banner Customizer"
      subtitle="Display a full-bleed quote graphic as a single image or an auto-advancing slideshow."
      badge={badge}
      onReset={handleResetToDefault}
      resetLabel="Reset to Default"
      resetConfirmTitle="Reset Quote Banner"
      resetConfirmMessage="Reset quote and media banner back to default settings?"
      onSave={handleSave}
      saveLabel="Save & Apply Banner"
    >
      <QuoteBannerPreview
        mode={mode}
        slides={slides}
        cardHeight={cardHeight}
        imageFit={imageFit}
        activePreviewImage={activePreviewImage}
        previewSlideIdx={previewSlideIdx}
        setPreviewSlideIdx={setPreviewSlideIdx}
      />

      {/* Tabs Navigation */}
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

      {/* Tab Content */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white/50 dark:bg-transparent">
        {activeTab === 'mode' && (
          <QuoteBannerModeTab
            mode={mode}
            setMode={setMode}
            singleImageUrl={singleImageUrl}
            slides={slides}
            customUrlInput={customUrlInput}
            setCustomUrlInput={setCustomUrlInput}
            onAddUrl={handleAddUrl}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            presetImages={PRESET_IMAGES}
            onSelectPreset={selectPreset}
          />
        )}

        {activeTab === 'slides' && mode === 'slideshow' && (
          <QuoteBannerSlidesTab
            slides={slides}
            previewSlideIdx={previewSlideIdx}
            setPreviewSlideIdx={setPreviewSlideIdx}
            onMoveSlide={moveSlide}
            onDeleteSlide={deleteSlide}
          />
        )}

        {activeTab === 'settings' && (
          <QuoteBannerSettingsTab
            mode={mode}
            cardHeight={cardHeight}
            setCardHeight={setCardHeight}
            imageFit={imageFit}
            setImageFit={setImageFit}
            autoplay={autoplay}
            setAutoplay={setAutoplay}
            slideDuration={slideDuration}
            setSlideDuration={setSlideDuration}
            transitionEffect={transitionEffect}
            setTransitionEffect={setTransitionEffect}
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
          />
        )}
      </div>
    </CustomizerShell>
  );
}

export default QuoteBannerCustomizerModal;
