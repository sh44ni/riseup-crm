/**
 * RISE UP CRM — WEATHER API CLIENT
 * Connects to /api/admin/weather via typed httpClient.
 */

import { httpClient } from '@/shared/api/client';

export type WeatherConditionKey =
  | 'sunny'
  | 'clear_night'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'windy';

export interface WeatherData {
  location: string;
  localtime?: string;
  temp_f: number;
  temp_c: number;
  feelslike_f: number;
  feelslike_c: number;
  high_f: number;
  low_f: number;
  high_c: number;
  low_c: number;
  condition_text: string;
  condition_key: WeatherConditionKey;
  humidity: number;
  wind_mph: number;
  is_day: boolean;
  is_fallback: boolean;
}

export function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/**
 * Normalizes arbitrary weather text descriptions into standard icon keys
 */
export function normalizeConditionKey(text: string, isDay: boolean = true): WeatherConditionKey {
  const t = (text || '').toLowerCase().trim();
  if (!isDay && (t.includes('clear') || t.includes('sunny'))) {
    return 'clear_night';
  }
  if (t.includes('thunder') || t.includes('lightning') || t.includes('storm')) {
    return 'thunderstorm';
  }
  if (
    t.includes('rain') ||
    t.includes('drizzle') ||
    t.includes('shower') ||
    t.includes('precipitation')
  ) {
    return 'rain';
  }
  if (t.includes('snow') || t.includes('blizzard') || t.includes('sleet') || t.includes('ice') || t.includes('flurries')) {
    return 'snow';
  }
  if (t.includes('fog') || t.includes('mist') || t.includes('haze') || t.includes('smoke')) {
    return 'fog';
  }
  if (t.includes('wind') || t.includes('breeze') || t.includes('gale')) {
    return 'windy';
  }
  if (t.includes('partly') || t.includes('scattered')) {
    return 'partly_cloudy';
  }
  if (t.includes('cloud') || t.includes('overcast')) {
    return 'cloudy';
  }
  if (t.includes('sun') || t.includes('clear') || t.includes('fair')) {
    return isDay ? 'sunny' : 'clear_night';
  }
  return isDay ? 'sunny' : 'clear_night';
}

export const FALLBACK_WEATHER_DATA: WeatherData = {
  location: 'Oceanside, CA',
  localtime: new Date().toISOString(),
  temp_f: 72,
  temp_c: 22,
  feelslike_f: 74,
  feelslike_c: 23,
  high_f: 76,
  low_f: 62,
  high_c: 24,
  low_c: 17,
  condition_text: 'Sunny',
  condition_key: 'sunny',
  humidity: 58,
  wind_mph: 8,
  is_day: true,
  is_fallback: true,
};

interface WeatherApiResponse {
  location?: string;
  localtime?: string;
  current?: {
    is_day?: number;
    condition?: { text?: string; condition_key?: WeatherConditionKey };
    condition_text?: string;
    condition_key?: WeatherConditionKey;
    temp_f?: number;
    temp?: number;
    feelslike_f?: number;
    feels_like?: number;
    humidity?: number;
    wind_mph?: number;
  };
  temp_f?: number;
  temp?: number;
  feelslike_f?: number;
  feels_like?: number;
  condition?: { text?: string; condition_key?: WeatherConditionKey };
  condition_text?: string;
  condition_key?: WeatherConditionKey;
  is_day?: number;
  humidity?: number;
  wind_mph?: number;
  forecast?: Array<{
    maxtemp_f?: number;
    high_f?: number;
    mintemp_f?: number;
    low_f?: number;
  }>;
  data?: WeatherApiResponse;
}

/**
 * Fetch current weather for a specific location from FastAPI backend
 */
export async function fetchCurrentWeather(location: string = 'Oceanside, CA'): Promise<WeatherData | null> {
  try {
    const url = `/admin/weather?location=${encodeURIComponent(location)}`;
    const rawData = await httpClient.get<WeatherApiResponse>(url, { timeoutMs: 3000 });
    const raw = rawData?.data ?? rawData;
    if (!raw) return null;

    const current = raw.current ?? raw;
    const isDay = Boolean(current.is_day !== undefined ? current.is_day : 1);
    const condText = current.condition?.text || current.condition_text || 'Sunny';
    const conditionKey =
      current.condition?.condition_key ||
      current.condition_key ||
      normalizeConditionKey(condText, isDay);

    const tempF = Math.round(current.temp_f ?? current.temp ?? 72);
    const feelsF = Math.round(current.feelslike_f ?? current.feels_like ?? tempF);

    const forecastDay = raw.forecast?.[0] ?? {};
    const highF = Math.round(forecastDay.maxtemp_f ?? forecastDay.high_f ?? tempF + 4);
    const lowF = Math.round(forecastDay.mintemp_f ?? forecastDay.low_f ?? tempF - 10);

    const shaped: WeatherData = {
      location: raw.location || location,
      localtime: raw.localtime || new Date().toISOString(),
      temp_f: tempF,
      temp_c: fToC(tempF),
      feelslike_f: feelsF,
      feelslike_c: fToC(feelsF),
      high_f: highF,
      low_f: lowF,
      high_c: fToC(highF),
      low_c: fToC(lowF),
      condition_text: condText,
      condition_key: conditionKey,
      humidity: current.humidity ?? 55,
      wind_mph: Math.round(current.wind_mph ?? 8),
      is_day: isDay,
      is_fallback: false,
    };

    return shaped;
  } catch {
    return null;
  }
}

/**
 * Check if backend weather service is accessible
 */
export async function checkWeatherBackendOnline(): Promise<boolean> {
  try {
    await httpClient.get<unknown>('/admin/weather?location=Oceanside,%20CA', { timeoutMs: 1200 });
    return true;
  } catch {
    return false;
  }
}
