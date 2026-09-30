/**
 * ==============================================================================
 * RISE UP CRM — HERO BANNER BACKEND API CLIENT
 * ==============================================================================
 * Implements the client-side REST interface for the Hero Banner system,
 * supporting optimistic caching, seamless cloud photo uploads, and
 * resilient offline fallback when the FastAPI backend is not running.
 * ==============================================================================
 */

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
}

export interface HeroImageUploadResult {
  url: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

import { apiFetch, API_BASE } from '@/lib/api';
import api from '@/lib/api';

/**
 * 1. Fetch All Hero Banners (Global + Per-Page Overrides)
 */
export async function fetchHeroBannersMap(): Promise<HeroBannerMapResponse | null> {
  try {
    const res = await apiFetch<any>('/admin/hero-banners');
    return res?.data ?? res;
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
    const res = await apiFetch<any>(`/admin/hero-banners/${pageId}`);
    return res?.data ?? res;
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
    const res = await apiFetch<any>(`/admin/hero-banners/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  } catch {
    return null;
  }
}

/**
 * 4. Reset Single Page Hero Banner to Global Defaults
 */
export async function resetHeroBannerOnBackend(pageId: string): Promise<boolean> {
  try {
    await apiFetch<any>(`/admin/hero-banners/${pageId}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 5. Upload Custom Image File to Cloud Storage
 * Returns the permanent CDN / public asset URL.
 */
export async function uploadHeroImageFile(file: File): Promise<HeroImageUploadResult | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const headers = api.getAuthHeaders();
    
    // Note: No Content-Type for FormData
    const response = await fetch(`${API_BASE}/admin/hero-banners/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) return null;
    const json = await response.json();
    return json?.data ?? json;
  } catch {
    return null;
  }
}

/**
 * 6. Quick Health Check to probe if FastAPI Backend is active
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    await apiFetch('/docs', { method: 'HEAD', timeoutMs: 1200 });
    return true;
  } catch {
    return false;
  }
}
