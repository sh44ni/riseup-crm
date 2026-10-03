import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Image as ImageIcon } from 'lucide-react';
import { QuoteBannerConfig, QuoteSlide } from '@/lib/quoteBannerStore';
import { CustomizerShell } from './CustomizerShell';
import { CustomizerBody, CustomizerSection, CustomizerTabs } from './customizer/CustomizerParts';
import { IMAGE_SPECS, ImageUploadField } from './customizer/ImageUploadField';
import { QuoteBannerPreview } from './quote-banner/QuoteBannerPreview';
import { QuoteBannerSettingsTab } from './quote-banner/QuoteBannerSettingsTab';

export interface QuoteBannerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: QuoteBannerConfig;
  /** Resolves true when the server accepted the change. */
  onSave: (newConfig: QuoteBannerConfig) => Promise<boolean>;
  onReset: () => Promise<boolean>;
  isSaving?: boolean;
}

export function QuoteBannerCustomizerModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  onReset,
  isSaving = false,
}: QuoteBannerCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'images' | 'layout'>('images');

  // Draft is initialised once per open so background refetches can't overwrite edits.
  const [mode, setMode] = useState(currentConfig.mode);
  const [singleImageUrl, setSingleImageUrl] = useState(currentConfig.singleImageUrl);
  const [slides, setSlides] = useState<QuoteSlide[]>(currentConfig.slides);
  const [autoplay, setAutoplay] = useState(currentConfig.autoplay);
  const [slideDuration, setSlideDuration] = useState(currentConfig.slideDuration);
  const [transitionEffect, setTransitionEffect] = useState(currentConfig.transitionEffect);
  const [cardHeight, setCardHeight] = useState(currentConfig.cardHeight);
  const [imageFit, setImageFit] = useState(currentConfig.imageFit);
  const [linkUrl, setLinkUrl] = useState(currentConfig.linkUrl || '');
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  const latest = useRef(currentConfig);
  latest.current = currentConfig;

  useEffect(() => {
    if (!isOpen) return;
    const c = latest.current;
    setMode(c.mode);
    setSingleImageUrl(c.singleImageUrl);
    setSlides(c.slides);
    setAutoplay(c.autoplay);
    setSlideDuration(c.slideDuration);
    setTransitionEffect(c.transitionEffect);
    setCardHeight(c.cardHeight);
    setImageFit(c.imageFit);
    setLinkUrl(c.linkUrl || '');
    setPreviewSlideIdx(0);
    setActiveTab('images');
  }, [isOpen]);

  const activePreviewImage = mode === 'single' ? singleImageUrl : slides[previewSlideIdx]?.imageUrl || slides[0]?.imageUrl || '';

  const onSlideUrls = (urls: string[]) => {
    setSlides(
      urls.map((url) => {
        const existing = slides.find((s) => s.imageUrl === url);
        return existing ?? { id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, imageUrl: url };
      })
    );
    setPreviewSlideIdx((i) => Math.min(i, Math.max(0, urls.length - 1)));
  };

  const handleSave = async () => {
    const ok = await onSave({
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
    if (ok) onClose();
  };

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<ImageIcon size={20} />}
      title="Quote Banner"
      subtitle="A single image or slideshow shown on every page."
      onReset={() => void onReset()}
      resetLabel="Clear banner"
      resetConfirmTitle="Clear quote banner"
      resetConfirmMessage="Remove your quote banner images and settings?"
      onSave={handleSave}
      saveLabel="Save"
      isSaving={isSaving}
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

      <CustomizerTabs
        tabs={[
          { id: 'images', label: 'Images', icon: <ImageIcon size={14} /> },
          { id: 'layout', label: 'Layout & behavior', icon: <Sliders size={14} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <CustomizerBody>
        {activeTab === 'images' ? (
          <>
            <CustomizerSection title="Display">
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Display mode">
                {(['single', 'slideshow'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === m
                        ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold">{m === 'single' ? 'Single image' : 'Slideshow'}</div>
                    <div className="text-[10px] text-slate-500">
                      {m === 'single' ? 'One static picture' : 'Several pictures, auto-advancing'}
                    </div>
                  </button>
                ))}
              </div>
            </CustomizerSection>

            {mode === 'single' ? (
              <ImageUploadField
                label="Banner image"
                images={singleImageUrl ? [singleImageUrl] : []}
                onChange={(urls) => setSingleImageUrl(urls[0] ?? '')}
                spec={IMAGE_SPECS.quote}
              />
            ) : (
              <ImageUploadField
                label={`Slides (${slides.length})`}
                images={slides.map((s) => s.imageUrl)}
                onChange={onSlideUrls}
                spec={IMAGE_SPECS.quote}
                multiple
                maxImages={20}
              />
            )}
          </>
        ) : (
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
      </CustomizerBody>
    </CustomizerShell>
  );
}

export default QuoteBannerCustomizerModal;
