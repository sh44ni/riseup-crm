import { useState, useEffect, useCallback } from 'react';
import {
  fetchQuoteBannerFromBackend,
  saveQuoteBannerToBackend,
  QuoteBannerConfigPayload,
  QuoteSlidePayload,
} from '@/api/quoteBannerApi';

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
  slideDuration: number; // Duration in seconds (e.g. 5)
  transitionEffect: 'fade' | 'slide';
  cardHeight: 'compact' | 'balanced' | 'tall'; // compact: 105px, balanced: 128px, tall: 155px
  imageFit: 'cover' | 'contain';
  linkUrl?: string;
}

export const DEFAULT_QUOTE_BANNER_CONFIG: QuoteBannerConfig = {
  mode: 'single',
  singleImageUrl: '/sidebar-coastal-card.jpg',
  slides: [
    {
      id: 'slide-1',
      imageUrl: '/sidebar-coastal-card.jpg',
      title: 'Coastal Roofing Craftsmanship',
    },
    {
      id: 'slide-2',
      imageUrl: '/hero-bg.jpg',
      title: 'Rise Up Fleet & Coastal Villa',
    },
    {
      id: 'slide-3',
      imageUrl: '/images/services/residential-roofing.jpg',
      title: 'Master Roofing Craftsmanship',
    },
    {
      id: 'slide-4',
      imageUrl: '/images/services/solar-roofing.jpg',
      title: 'Clean Energy & Solar Tiles',
    },
  ],
  autoplay: true,
  slideDuration: 5,
  transitionEffect: 'fade',
  cardHeight: 'balanced',
  imageFit: 'cover',
  linkUrl: '',
};

const STORAGE_KEY = 'crm_quote_banner_config';
const SYNC_EVENT_NAME = 'crm_quote_banner_change';

/**
 * Load quote banner configuration from local storage with fallback
 */
export function loadQuoteBannerConfig(): QuoteBannerConfig {
  if (typeof window === 'undefined') return DEFAULT_QUOTE_BANNER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUOTE_BANNER_CONFIG;
    const parsed = JSON.parse(raw);
    const singleImg = (parsed.singleImageUrl === '/hero-bg.jpg' || !parsed.singleImageUrl)
      ? DEFAULT_QUOTE_BANNER_CONFIG.singleImageUrl
      : parsed.singleImageUrl;
    return {
      ...DEFAULT_QUOTE_BANNER_CONFIG,
      ...parsed,
      singleImageUrl: singleImg,
      slides: Array.isArray(parsed.slides) && parsed.slides.length > 0
        ? parsed.slides.map((s: QuoteSlide, idx: number) =>
            idx === 0 && s.imageUrl === '/hero-bg.jpg'
              ? { ...s, imageUrl: '/sidebar-coastal-card.jpg', title: 'Coastal Roofing Craftsmanship' }
              : s
          )
        : DEFAULT_QUOTE_BANNER_CONFIG.slides,
    };
  } catch (err) {
    console.error('Failed to parse quote banner config from storage:', err);
    return DEFAULT_QUOTE_BANNER_CONFIG;
  }
}

/**
 * Save quote banner configuration to local storage and dispatch cross-tab sync event
 */
export function saveQuoteBannerConfig(config: QuoteBannerConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: config }));
  } catch (err) {
    console.error('Failed to save quote banner config to storage:', err);
  }
}

/**
 * React hook for consuming and updating the quote banner state
 */
export function useQuoteBanner() {
  const [config, setConfig] = useState<QuoteBannerConfig>(loadQuoteBannerConfig);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Synchronize across tabs and components
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setConfig(detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    };
  }, []);

  // Background revalidation with backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetchQuoteBannerFromBackend().then((backendData) => {
      if (backendData && isMounted) {
        setConfig((prev) => {
          const merged: QuoteBannerConfig = {
            ...prev,
            ...backendData,
            slides: backendData.slides?.length ? backendData.slides : prev.slides,
          };
          saveQuoteBannerConfig(merged);
          return merged;
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Slide navigation helpers
  const slidesCount = config.slides?.length || 1;

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % slidesCount);
  }, [slidesCount]);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + slidesCount) % slidesCount);
  }, [slidesCount]);

  // Autoplay timer for slideshow mode
  useEffect(() => {
    if (config.mode !== 'slideshow' || !config.autoplay || isHovered || slidesCount <= 1) {
      return;
    }

    const intervalMs = Math.max(2, config.slideDuration || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slidesCount);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [config.mode, config.autoplay, config.slideDuration, isHovered, slidesCount]);

  // Keep current slide within valid bounds if slides array changes
  useEffect(() => {
    if (currentSlideIndex >= slidesCount) {
      setCurrentSlideIndex(0);
    }
  }, [currentSlideIndex, slidesCount]);

  const updateConfig = useCallback(async (newConfig: Partial<QuoteBannerConfig>) => {
    const updated: QuoteBannerConfig = { ...config, ...newConfig };
    setConfig(updated);
    saveQuoteBannerConfig(updated);
    // Asynchronous backend persistence
    await saveQuoteBannerToBackend(updated as QuoteBannerConfigPayload);
  }, [config]);

  const resetConfig = useCallback(async () => {
    setConfig(DEFAULT_QUOTE_BANNER_CONFIG);
    saveQuoteBannerConfig(DEFAULT_QUOTE_BANNER_CONFIG);
    await saveQuoteBannerToBackend(DEFAULT_QUOTE_BANNER_CONFIG as QuoteBannerConfigPayload);
  }, []);

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
  };
}
