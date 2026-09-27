import { useState, useEffect, useCallback } from 'react';
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

export const DEFAULT_WEATHER_CONFIG: WeatherWidgetConfig = {
  location: 'Oceanside, CA',
  customImage: '/hero-bg.jpg',
  imageOpacity: 95, // High clarity to make the rig and villa crisp and visible
  overlayStrength: 45, // Soft ambient liquid glass wash instead of washed out opaque white
  tempUnit: 'F',
  textColors: DEFAULT_TEXT_COLORS,
};

const CONFIG_STORAGE_KEY = 'crm_weather_widget_config';
const CACHED_DATA_KEY = 'crm_weather_widget_cached_data';
const SYNC_EVENT_NAME = 'crm_weather_change';

export function loadWeatherConfig(): WeatherWidgetConfig {
  if (typeof window === 'undefined') return DEFAULT_WEATHER_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_WEATHER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WEATHER_CONFIG,
      ...parsed,
      textColors: {
        ...DEFAULT_TEXT_COLORS,
        ...(parsed.textColors || {}),
      },
    };
  } catch (err) {
    console.error('Failed to parse weather config from storage:', err);
    return DEFAULT_WEATHER_CONFIG;
  }
}

export function saveWeatherConfig(config: WeatherWidgetConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: config }));
  } catch (err) {
    console.error('Failed to save weather config to storage:', err);
  }
}

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
 * Custom React hook for the Coastal Weather Widget
 */
export function useWeatherWidget() {
  const [config, setConfig] = useState<WeatherWidgetConfig>(() => loadWeatherConfig());
  const [weatherData, setWeatherData] = useState<WeatherData>(() => loadCachedWeatherData());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Background fetch from backend weather API
  const refreshWeather = useCallback(
    async (targetLocation?: string) => {
      const loc = targetLocation || config.location;
      setIsLoading(true);
      try {
        const live = await fetchCurrentWeather(loc);
        if (live) {
          setWeatherData(live);
          saveCachedWeatherData(live);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [config.location]
  );

  // Initial load background revalidation
  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

  // Sync state across components & tabs
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<WeatherWidgetConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(loadWeatherConfig());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONFIG_STORAGE_KEY) {
        setConfig(loadWeatherConfig());
      }
      if (e.key === CACHED_DATA_KEY) {
        setWeatherData(loadCachedWeatherData());
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateConfig = useCallback((newConfig: WeatherWidgetConfig) => {
    saveWeatherConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const resetConfig = useCallback(() => {
    saveWeatherConfig(DEFAULT_WEATHER_CONFIG);
    setConfig(DEFAULT_WEATHER_CONFIG);
    setWeatherData(FALLBACK_WEATHER_DATA);
    saveCachedWeatherData(FALLBACK_WEATHER_DATA);
  }, []);

  return {
    config,
    weatherData,
    effectiveCondition: weatherData.condition_key,
    isLoading,
    updateConfig,
    resetConfig,
    refreshWeather,
  };
}
