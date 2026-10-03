import { useState, useEffect, useCallback } from 'react';
import { useCustomizationMutations, useMySlot } from '@/hooks/useMyCustomizations';

export interface QuoteSlide {
  id: string;
  imageUrl: string;
  title?: string;
  altText?: string;
}

export interface QuoteBannerConfig {
  mode: 'single' | 'slideshow';
  singleImageUrl: string;
  slides: QuoteSlide[];
  autoplay: boolean;
  slideDuration: number; // seconds
  transitionEffect: 'fade' | 'slide';
  cardHeight: 'compact' | 'balanced' | 'tall'; // compact: 105px, balanced: 128px, tall: 155px
  imageFit: 'cover' | 'contain';
  linkUrl?: string;
}

/** Empty by design: no image until the user uploads one. */
export const EMPTY_QUOTE_BANNER_CONFIG: QuoteBannerConfig = {
  mode: 'single',
  singleImageUrl: '',
  slides: [],
  autoplay: true,
  slideDuration: 5,
  transitionEffect: 'fade',
  cardHeight: 'balanced',
  imageFit: 'cover',
  linkUrl: '',
};

export const QUOTE_SLOT = 'quote_banner';

interface StoredQuote {
  mode?: 'single' | 'slideshow';
  single_image_url?: string;
  slides?: Array<{ id: string; image_url: string; title?: string | null; alt_text?: string | null }>;
  autoplay?: boolean;
  slide_duration?: number;
  transition_effect?: 'fade' | 'slide';
  card_height?: 'compact' | 'balanced' | 'tall';
  image_fit?: 'cover' | 'contain';
  link_url?: string | null;
}

export function fromStored(stored: Partial<StoredQuote> | undefined): QuoteBannerConfig {
  const d = EMPTY_QUOTE_BANNER_CONFIG;
  if (!stored) return d;
  return {
    mode: stored.mode ?? d.mode,
    singleImageUrl: stored.single_image_url ?? d.singleImageUrl,
    slides: (stored.slides ?? []).map((s) => ({
      id: s.id,
      imageUrl: s.image_url,
      title: s.title ?? undefined,
      altText: s.alt_text ?? undefined,
    })),
    autoplay: stored.autoplay ?? d.autoplay,
    slideDuration: stored.slide_duration ?? d.slideDuration,
    transitionEffect: stored.transition_effect ?? d.transitionEffect,
    cardHeight: stored.card_height ?? d.cardHeight,
    imageFit: stored.image_fit ?? d.imageFit,
    linkUrl: stored.link_url ?? '',
  };
}

export function toStored(config: QuoteBannerConfig): Record<string, unknown> {
  return {
    mode: config.mode,
    single_image_url: config.singleImageUrl || '',
    slides: config.slides.map((s) => ({
      id: s.id,
      image_url: s.imageUrl,
      title: s.title || null,
      alt_text: s.altText || null,
    })),
    autoplay: config.autoplay,
    slide_duration: config.slideDuration,
    transition_effect: config.transitionEffect,
    card_height: config.cardHeight,
    image_fit: config.imageFit,
    link_url: config.linkUrl?.trim() ? config.linkUrl.trim() : null,
  };
}

/** The image the card should show right now ('' = nothing uploaded). */
export function activeQuoteImage(config: QuoteBannerConfig, slideIndex: number): string {
  if (config.mode === 'slideshow') {
    const slide = config.slides[slideIndex] || config.slides[0];
    return slide?.imageUrl || '';
  }
  return config.singleImageUrl || '';
}

export function useQuoteBanner() {
  const { config: stored } = useMySlot<StoredQuote & Record<string, unknown>>(QUOTE_SLOT);
  const { save, reset, isSaving } = useCustomizationMutations();
  const config = fromStored(stored);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const slidesCount = config.slides.length || 1;

  const nextSlide = useCallback(() => setCurrentSlideIndex((p) => (p + 1) % slidesCount), [slidesCount]);
  const prevSlide = useCallback(
    () => setCurrentSlideIndex((p) => (p - 1 + slidesCount) % slidesCount),
    [slidesCount]
  );

  useEffect(() => {
    if (config.mode !== 'slideshow' || !config.autoplay || isHovered || slidesCount <= 1) return;
    const timer = setInterval(
      () => setCurrentSlideIndex((p) => (p + 1) % slidesCount),
      Math.max(2, config.slideDuration || 5) * 1000
    );
    return () => clearInterval(timer);
  }, [config.mode, config.autoplay, config.slideDuration, isHovered, slidesCount]);

  useEffect(() => {
    if (currentSlideIndex >= slidesCount) setCurrentSlideIndex(0);
  }, [currentSlideIndex, slidesCount]);

  const updateConfig = useCallback(
    (next: QuoteBannerConfig): Promise<boolean> => save(QUOTE_SLOT, toStored(next)),
    [save]
  );
  const resetConfig = useCallback(() => reset(QUOTE_SLOT), [reset]);

  return {
    config,
    currentSlideIndex,
    setCurrentSlideIndex,
    nextSlide,
    prevSlide,
    isHovered,
    setIsHovered,
    updateConfig,
    resetConfig,
    isSaving,
  };
}
