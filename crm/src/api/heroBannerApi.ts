/**
 * RISE UP CRM — HERO BANNER BACKEND API CLIENT
 * Connects to /api/admin/hero-banners via typed httpClient.
 */

import { httpClient } from '@/shared/api/client';

export interface HeroBannerBackendData {
  page_id: string;
  image_url: string;
  zoom: number;
  position_x: number;
  position_y: number;
  opacity: number;
  overlay_strength: number;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  is_global: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface HeroBannerSavePayload {
  image_url: string;
  zoom: number;
  position_x: number;
  position_y: number;
  opacity: number;
  overlay_strength: number;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  apply_globally: boolean;
}

export interface HeroBannerMapResponse {
  global_banner?: HeroBannerBackendData;
  pages?: Record<string, HeroBannerBackendData>;
  data?: HeroBannerMapResponse;
}

export interface HeroImageUploadResult {
  url: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

/**
 * 1. Fetch All Hero Banners (Global + Per-Page Overrides)
 */
export async function fetchHeroBannersMap(): Promise<HeroBannerMapResponse | null> {
  try {
    const res = await httpClient.get<HeroBannerMapResponse>('/admin/hero-banners');
    return res?.data ?? res ?? null;
  } catch {
    return null;
  }
}

/**
 * 2. Fetch Single Page Hero Banner
 */
export async function fetchHeroBannerForPage(
  pageId: string
): Promise<HeroBannerBackendData | null> {
  try {
    const res = await httpClient.get<{ data?: HeroBannerBackendData } | HeroBannerBackendData>(`/admin/hero-banners/${pageId}`);
    return (res && 'data' in res ? res.data : res as HeroBannerBackendData) ?? null;
  } catch {
    return null;
  }
}

/**
 * 3. Save / Update Hero Banner on Backend
 */
export async function saveHeroBannerToBackend(
  pageId: string,
  payload: HeroBannerSavePayload
): Promise<HeroBannerBackendData | null> {
  try {
    const res = await httpClient.put<{ data?: HeroBannerBackendData } | HeroBannerBackendData>(
      `/admin/hero-banners/${pageId}`,
      payload
    );
    return (res && 'data' in res ? res.data : res as HeroBannerBackendData) ?? null;
  } catch {
    return null;
  }
}

/**
 * 4. Reset Single Page Hero Banner to Global Defaults
 */
export async function resetHeroBannerOnBackend(pageId: string): Promise<boolean> {
  try {
    await httpClient.delete<unknown>(`/admin/hero-banners/${pageId}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * 5. Upload Custom Image File to Cloud Storage
 */
export async function uploadHeroImageFile(file: File): Promise<HeroImageUploadResult | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const json = await httpClient.post<{ data?: HeroImageUploadResult } | HeroImageUploadResult>('/admin/hero-banners/upload', formData);
    return (json && typeof json === 'object' && 'data' in json ? (json.data as HeroImageUploadResult) : (json as HeroImageUploadResult)) ?? null;
  } catch {
    return null;
  }
}

/**
 * 6. Quick Health Check to probe if FastAPI Backend is active
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    await httpClient.get<unknown>('/docs', { timeoutMs: 1500 });
    return true;
  } catch {
    return false;
  }
}
