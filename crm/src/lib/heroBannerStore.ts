import { useCallback } from 'react';
import { useCustomizationMutations, useMyCustomizationMap } from '@/hooks/useMyCustomizations';

/**
 * Hero banners are stored per user on the server:
 *   hero:{pageId}  -> this page's image/framing override + custom copy
 *   hero:all       -> the user's shared image/framing ("Apply to all pages")
 * Nothing is customized until the user uploads/sets it: no default image exists.
 */

export interface DefaultBannerText {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface ActiveHeroBanner {
  /** Empty string = nothing uploaded yet (the hero shows its neutral background). */
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

export interface HeroSaveParams {
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
}

export const HERO_FRAMING_DEFAULTS = {
  zoom: 100,
  positionX: 50,
  positionY: 50,
  opacity: 80,
  overlayStrength: 85,
} as const;

/** Backend limits for hero copy (kept in sync with app/schemas/customization.py). */
export const HERO_TEXT_LIMITS = { eyebrow: 80, title: 60, subtitle: 160 } as const;

type SlotConfig = {
  image_url?: string | null;
  zoom?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  opacity?: number | null;
  overlay_strength?: number | null;
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
};

export function resolveHeroBanner(
  page: SlotConfig | undefined,
  all: SlotConfig | undefined,
  defaultText: DefaultBannerText
): ActiveHeroBanner {
  const framing = page?.image_url ? page : all?.image_url ? all : page;
  return {
    imageUrl: page?.image_url || all?.image_url || '',
    zoom: framing?.zoom ?? HERO_FRAMING_DEFAULTS.zoom,
    positionX: framing?.position_x ?? HERO_FRAMING_DEFAULTS.positionX,
    positionY: framing?.position_y ?? HERO_FRAMING_DEFAULTS.positionY,
    opacity: framing?.opacity ?? HERO_FRAMING_DEFAULTS.opacity,
    overlayStrength: framing?.overlay_strength ?? HERO_FRAMING_DEFAULTS.overlayStrength,
    isCustomImage: Boolean(page?.image_url),
    eyebrow: page?.eyebrow || defaultText.eyebrow,
    title: page?.title || defaultText.title,
    subtitle: page?.subtitle || defaultText.subtitle,
    hasCustomText: Boolean(page?.eyebrow || page?.title || page?.subtitle),
  };
}

export function useHeroBanner(pageId: string, defaultText: DefaultBannerText) {
  const { data: map } = useMyCustomizationMap();
  const { save, reset, isSaving } = useCustomizationMutations();

  const page = map?.[`hero:${pageId}`] as SlotConfig | undefined;
  const all = map?.['hero:all'] as SlotConfig | undefined;
  const activeBanner = resolveHeroBanner(page, all, defaultText);

  const saveCustomization = useCallback(
    async (params: HeroSaveParams): Promise<boolean> => {
      const textOrNull = (value: string, fallback: string) => {
        const trimmed = value.trim();
        return trimmed && trimmed !== fallback ? trimmed : null;
      };
      return save(`hero:${pageId}`, {
        image_url: params.imageUrl || null,
        zoom: params.zoom,
        position_x: params.positionX,
        position_y: params.positionY,
        opacity: params.opacity,
        overlay_strength: params.overlayStrength,
        eyebrow: textOrNull(params.eyebrow, defaultText.eyebrow),
        title: textOrNull(params.title, defaultText.title),
        subtitle: textOrNull(params.subtitle, defaultText.subtitle),
        apply_to_all: params.applyGlobally,
      });
    },
    [save, pageId, defaultText.eyebrow, defaultText.title, defaultText.subtitle]
  );

  const resetPageToDefaults = useCallback(() => reset(`hero:${pageId}`), [reset, pageId]);

  return { activeBanner, saveCustomization, resetPageToDefaults, isSaving };
}
