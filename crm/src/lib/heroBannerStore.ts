import { useState, useEffect, useCallback } from 'react';
import {
  fetchHeroBannersMap,
  saveHeroBannerToBackend,
  resetHeroBannerOnBackend,
  HeroBannerSavePayload,
  HeroBannerMapResponse,
} from '@/api/heroBannerApi';

export interface PageBannerOverrides {
  customImage?: string;
  zoom?: number;
  positionX?: number; // 0% to 100%
  positionY?: number; // 0% to 100%
  opacity?: number; // 30% to 100%
  overlayStrength?: number; // 40% to 100%
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export interface HeroBannerConfig {
  globalImage: string;
  globalZoom: number;
  globalPositionX: number;
  globalPositionY: number;
  globalOpacity: number;
  globalOverlayStrength: number;
  pageOverrides: Record<string, PageBannerOverrides>;
}

export const DEFAULT_HERO_CONFIG: HeroBannerConfig = {
  globalImage: '/hero-bg.jpg',
  globalZoom: 100,
  globalPositionX: 80, // Default center-right for the truck and coastal panorama
  globalPositionY: 50,
  globalOpacity: 80,
  globalOverlayStrength: 85,
  pageOverrides: {},
};

const STORAGE_KEY = 'crm_hero_banner_config';
const SYNC_EVENT_NAME = 'crm_hero_banner_change';

// Safe localStorage loader
export function loadHeroBannerConfig(): HeroBannerConfig {
  if (typeof window === 'undefined') return DEFAULT_HERO_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HERO_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_HERO_CONFIG,
      ...parsed,
      pageOverrides: {
        ...DEFAULT_HERO_CONFIG.pageOverrides,
        ...(parsed.pageOverrides || {}),
      },
    };
  } catch (err) {
    console.error('Failed to parse hero banner config from storage:', err);
    return DEFAULT_HERO_CONFIG;
  }
}

// Safe localStorage saver & event dispatcher
export function saveHeroBannerConfig(config: HeroBannerConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: config }));
  } catch (err) {
    console.error('Failed to save hero banner config to storage:', err);
  }
}

/**
 * Merge backend hero banners response into local configuration
 */
export function mergeBackendIntoConfig(
  currentConfig: HeroBannerConfig,
  backendMap: HeroBannerMapResponse
): HeroBannerConfig {
  const updated: HeroBannerConfig = {
    ...currentConfig,
    pageOverrides: { ...currentConfig.pageOverrides },
  };

  if (backendMap.global_banner) {
    const gb = backendMap.global_banner;
    updated.globalImage = gb.image_url || updated.globalImage;
    updated.globalZoom = gb.zoom ?? updated.globalZoom;
    updated.globalPositionX = gb.position_x ?? updated.globalPositionX;
    updated.globalPositionY = gb.position_y ?? updated.globalPositionY;
    updated.globalOpacity = gb.opacity ?? updated.globalOpacity;
    updated.globalOverlayStrength = gb.overlay_strength ?? updated.globalOverlayStrength;
  }

  if (backendMap.pages && Object.keys(backendMap.pages).length > 0) {
    for (const [pid, pdata] of Object.entries(backendMap.pages)) {
      const existing = updated.pageOverrides[pid] || {};
      updated.pageOverrides[pid] = {
        ...existing,
        customImage: pdata.image_url || existing.customImage,
        zoom: pdata.zoom ?? existing.zoom,
        positionX: pdata.position_x ?? existing.positionX,
        positionY: pdata.position_y ?? existing.positionY,
        opacity: pdata.opacity ?? existing.opacity,
        overlayStrength: pdata.overlay_strength ?? existing.overlayStrength,
        eyebrow: pdata.eyebrow ?? existing.eyebrow,
        title: pdata.title ?? existing.title,
        subtitle: pdata.subtitle ?? existing.subtitle,
      };
    }
  }

  return updated;
}

export interface DefaultBannerText {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface ActiveHeroBanner {
  imageUrl: string;
  zoom: number;
  positionX: number;
  positionY: number;
  opacity: number;
  overlayStrength: number;
  isCustomImage: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  hasCustomText: boolean;
}

/**
 * Custom React hook for reading and updating hero banner settings
 * Supports reactive synchronization across pages, tabs, and FastAPI backend.
 */
export function useHeroBanner(pageId: string, defaultText: DefaultBannerText) {
  const [config, setConfig] = useState<HeroBannerConfig>(() => loadHeroBannerConfig());

  // Background revalidation on mount from FastAPI backend
  useEffect(() => {
    let isMounted = true;
    fetchHeroBannersMap().then((backendData) => {
      if (!isMounted || !backendData) return;
      const current = loadHeroBannerConfig();
      const merged = mergeBackendIntoConfig(current, backendData);
      saveHeroBannerConfig(merged);
      setConfig(merged);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for real-time changes across components and storage
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<HeroBannerConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(loadHeroBannerConfig());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setConfig(loadHeroBannerConfig());
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const pageOverride = config.pageOverrides[pageId] || {};

  // Resolved active values
  const activeBanner: ActiveHeroBanner = {
    imageUrl: pageOverride.customImage || config.globalImage,
    zoom: pageOverride.zoom !== undefined ? pageOverride.zoom : config.globalZoom,
    positionX: pageOverride.positionX !== undefined ? pageOverride.positionX : config.globalPositionX,
    positionY: pageOverride.positionY !== undefined ? pageOverride.positionY : config.globalPositionY,
    opacity: pageOverride.opacity !== undefined ? pageOverride.opacity : config.globalOpacity,
    overlayStrength:
      pageOverride.overlayStrength !== undefined
        ? pageOverride.overlayStrength
        : config.globalOverlayStrength,
    isCustomImage: Boolean(pageOverride.customImage),
    eyebrow: pageOverride.eyebrow || defaultText.eyebrow,
    title: pageOverride.title || defaultText.title,
    subtitle: pageOverride.subtitle || defaultText.subtitle,
    hasCustomText: Boolean(pageOverride.eyebrow || pageOverride.title || pageOverride.subtitle),
  };

  // Save changes from the customizer modal
  const saveCustomization = useCallback(
    (params: {
      applyGlobally: boolean;
      imageUrl: string;
      zoom: number;
      positionX: number;
      positionY: number;
      opacity: number;
      overlayStrength: number;
      eyebrow: string;
      title: string;
      subtitle: string;
    }) => {
      const currentConfig = loadHeroBannerConfig();
      const existingPage = currentConfig.pageOverrides[pageId] || {};

      let updatedConfig: HeroBannerConfig;

      if (params.applyGlobally) {
        // Apply image, zoom, position, opacity, and overlay strength globally
        updatedConfig = {
          ...currentConfig,
          globalImage: params.imageUrl,
          globalZoom: params.zoom,
          globalPositionX: params.positionX,
          globalPositionY: params.positionY,
          globalOpacity: params.opacity,
          globalOverlayStrength: params.overlayStrength,
          pageOverrides: {
            ...currentConfig.pageOverrides,
            // Clean up any page-specific image override so it inherits globally, but keep page text
            [pageId]: {
              ...existingPage,
              customImage: undefined,
              zoom: undefined,
              positionX: undefined,
              positionY: undefined,
              opacity: undefined,
              overlayStrength: undefined,
              eyebrow: params.eyebrow !== defaultText.eyebrow ? params.eyebrow : undefined,
              title: params.title !== defaultText.title ? params.title : undefined,
              subtitle: params.subtitle !== defaultText.subtitle ? params.subtitle : undefined,
            },
          },
        };
      } else {
        // Apply image and crop only to this specific page
        updatedConfig = {
          ...currentConfig,
          pageOverrides: {
            ...currentConfig.pageOverrides,
            [pageId]: {
              ...existingPage,
              customImage: params.imageUrl,
              zoom: params.zoom,
              positionX: params.positionX,
              positionY: params.positionY,
              opacity: params.opacity,
              overlayStrength: params.overlayStrength,
              eyebrow: params.eyebrow !== defaultText.eyebrow ? params.eyebrow : undefined,
              title: params.title !== defaultText.title ? params.title : undefined,
              subtitle: params.subtitle !== defaultText.subtitle ? params.subtitle : undefined,
            },
          },
        };
      }

      saveHeroBannerConfig(updatedConfig);
      setConfig(updatedConfig);

      // Asynchronous background persistence to FastAPI backend (silent fallback if offline)
      const backendPayload: HeroBannerSavePayload = {
        image_url: params.imageUrl,
        zoom: params.zoom,
        position_x: params.positionX,
        position_y: params.positionY,
        opacity: params.opacity,
        overlay_strength: params.overlayStrength,
        eyebrow: params.eyebrow,
        title: params.title,
        subtitle: params.subtitle,
        apply_globally: params.applyGlobally,
      };
      saveHeroBannerToBackend(pageId, backendPayload).catch((err) => {
        console.debug('[heroBannerStore] Background backend save suppressed:', err);
      });
    },
    [pageId, defaultText]
  );

  // Reset page customizations
  const resetPageToDefaults = useCallback(() => {
    const currentConfig = loadHeroBannerConfig();
    const newOverrides = { ...currentConfig.pageOverrides };
    delete newOverrides[pageId];

    const updatedConfig: HeroBannerConfig = {
      ...currentConfig,
      pageOverrides: newOverrides,
    };

    saveHeroBannerConfig(updatedConfig);
    setConfig(updatedConfig);

    // Asynchronous background deletion on FastAPI backend
    resetHeroBannerOnBackend(pageId).catch((err) => {
      console.debug('[heroBannerStore] Background backend reset suppressed:', err);
    });
  }, [pageId]);

  // Reset everything to factory defaults
  const resetAllToFactoryDefaults = useCallback(() => {
    saveHeroBannerConfig(DEFAULT_HERO_CONFIG);
    setConfig(DEFAULT_HERO_CONFIG);
  }, []);

  return {
    activeBanner,
    rawConfig: config,
    saveCustomization,
    resetPageToDefaults,
    resetAllToFactoryDefaults,
  };
}
