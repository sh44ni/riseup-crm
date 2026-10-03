import { useState, useEffect, useCallback } from 'react';
import { useCustomizationMutations, useMySlot } from '@/hooks/useMyCustomizations';
import {
  WeatherData,
  WeatherConditionKey,
  FALLBACK_WEATHER_DATA,
  fetchCurrentWeather,
} from '@/api/weatherApi';

export interface WeatherTextColors {
  tempColor?: string; // Main temperature e.g. '#1F1F1F' or '#FFFFFF'
  secondaryTempColor?: string; // Secondary temp '/ 22°C' e.g. '#64748B' or '#E2E8F0'
  metricsColor?: string; // 'H: 76° • L: 62° • Feels 74°' e.g. '#334155' or '#CBD5E1'
  locationColor?: string; // Location text e.g. '#0369A1' or '#FFFFFF'
  conditionBadgeColor?: string; // Condition text e.g. '#1E293B' or '#FFFFFF'
  conditionBadgeBg?: string; // Condition badge background e.g. 'rgba(255,255,255,0.85)' or 'rgba(0,0,0,0.6)'
}

export interface WeatherWidgetConfig {
  location: string;
  customImage: string;
  imageOpacity: number; // 40% to 100%
  overlayStrength: number; // 0% to 90% (lower = more image visibility)
  tempUnit: 'F' | 'C';
  textColors: WeatherTextColors;
}

export const DEFAULT_TEXT_COLORS: WeatherTextColors = {
  tempColor: '#1F1F1F',
  secondaryTempColor: '#64748B',
  metricsColor: '#334155',
  locationColor: '#0369A1',
  conditionBadgeColor: '#1E293B',
  conditionBadgeBg: 'rgba(255, 255, 255, 0.85)',
};

/** Empty by design: no wallpaper until the user uploads one. */
export const DEFAULT_WEATHER_CONFIG: WeatherWidgetConfig = {
  location: '',
  customImage: '',
  imageOpacity: 95,
  overlayStrength: 45,
  tempUnit: 'F',
  textColors: DEFAULT_TEXT_COLORS,
};

/** Used for the live weather lookup only when the user hasn't chosen a location. */
export const FALLBACK_WEATHER_LOCATION = 'Oceanside, CA';

export const WEATHER_SLOT = 'weather_widget';

interface StoredWeather {
  location?: string;
  custom_image?: string;
  image_opacity?: number;
  overlay_strength?: number;
  temp_unit?: 'F' | 'C';
  text_colors?: Record<string, string>;
}

export function weatherFromStored(stored: Partial<StoredWeather> | undefined): WeatherWidgetConfig {
  const d = DEFAULT_WEATHER_CONFIG;
  if (!stored) return d;
  return {
    location: stored.location ?? d.location,
    customImage: stored.custom_image ?? d.customImage,
    imageOpacity: stored.image_opacity ?? d.imageOpacity,
    overlayStrength: stored.overlay_strength ?? d.overlayStrength,
    tempUnit: stored.temp_unit ?? d.tempUnit,
    textColors: { ...DEFAULT_TEXT_COLORS, ...(stored.text_colors || {}) },
  };
}

export function weatherToStored(config: WeatherWidgetConfig): Record<string, unknown> {
  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.textColors || {})) {
    if (value) colors[key] = value;
  }
  return {
    location: config.location.trim(),
    custom_image: config.customImage || '',
    image_opacity: config.imageOpacity,
    overlay_strength: config.overlayStrength,
    temp_unit: config.tempUnit,
    text_colors: colors,
  };
}

const CACHED_DATA_KEY = 'crm_weather_widget_cached_data';
export function loadCachedWeatherData(): WeatherData {
  if (typeof window === 'undefined') return FALLBACK_WEATHER_DATA;
  try {
    const raw = localStorage.getItem(CACHED_DATA_KEY);
    if (!raw) return FALLBACK_WEATHER_DATA;
    return { ...FALLBACK_WEATHER_DATA, ...JSON.parse(raw) };
  } catch {
    return FALLBACK_WEATHER_DATA;
  }
}

export function saveCachedWeatherData(data: WeatherData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_DATA_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Weather widget hook. Appearance settings come from the server (per user);
 * only the last live weather reading is cached locally to avoid a loading flash.
 */
export function useWeatherWidget() {
  const { config: stored } = useMySlot<StoredWeather & Record<string, unknown>>(WEATHER_SLOT);
  const { save, reset, isSaving } = useCustomizationMutations();
  const config = weatherFromStored(stored);

  const [weatherData, setWeatherData] = useState<WeatherData>(() => loadCachedWeatherData());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const lookupLocation = config.location || FALLBACK_WEATHER_LOCATION;

  const refreshWeather = useCallback(
    async (targetLocation?: string) => {
      setIsLoading(true);
      try {
        const live = await fetchCurrentWeather(targetLocation || lookupLocation);
        if (live) {
          setWeatherData(live);
          saveCachedWeatherData(live);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [lookupLocation]
  );

  useEffect(() => {
    void refreshWeather();
  }, [refreshWeather]);

  const updateConfig = useCallback(
    (next: WeatherWidgetConfig): Promise<boolean> => save(WEATHER_SLOT, weatherToStored(next)),
    [save]
  );
  const resetConfig = useCallback(() => reset(WEATHER_SLOT), [reset]);

  return {
    config,
    weatherData,
    effectiveCondition: weatherData.condition_key,
    isLoading,
    isSaving,
    updateConfig,
    resetConfig,
    refreshWeather,
  };
}