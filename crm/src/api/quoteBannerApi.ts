/**
 * Rise Up CRM — Sidebar Quote Banner API Client
 * Handles fetching, updating, and uploading media for the sidebar quote banner widget.
 */

import { httpClient } from '@/shared/api/client';

export interface QuoteSlidePayload {
  id: string;
  imageUrl: string;
  title?: string;
  altText?: string;
}

export interface QuoteBannerConfigPayload {
  mode: 'single' | 'slideshow';
  singleImageUrl: string;
  slides: QuoteSlidePayload[];
  autoplay: boolean;
  slideDuration: number;
  transitionEffect: 'fade' | 'slide';
  cardHeight: 'compact' | 'balanced' | 'tall';
  imageFit: 'cover' | 'contain';
  linkUrl?: string;
  updatedAt?: string;
}

export interface QuoteBannerApiResponse {
  success: boolean;
  data: QuoteBannerConfigPayload;
  message?: string;
}

/**
 * Fetches the quote banner configuration from the backend.
 */
export async function fetchQuoteBannerFromBackend(): Promise<QuoteBannerConfigPayload | null> {
  try {
    const json = await httpClient.get<QuoteBannerApiResponse>('/admin/quote-banner', { timeoutMs: 3000 });
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Saves the quote banner configuration to the backend.
 */
export async function saveQuoteBannerToBackend(
  payload: QuoteBannerConfigPayload
): Promise<boolean> {
  try {
    await httpClient.put<unknown>('/admin/quote-banner', {
      ...payload,
      updatedAt: new Date().toISOString(),
    }, {
      timeoutMs: 4000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Uploads a quote banner image file to cloud storage via backend.
 */
export async function uploadQuoteBannerImage(
  file: File
): Promise<{ success: boolean; url: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const data = await httpClient.post<{ data?: { url?: string } }>('/admin/quote-banner/upload', formData);
    if (data?.data?.url) {
      return { success: true, url: data.data.url };
    }
  } catch {
    // Fall back to base64 data URL
  }

  // Local fallback: read file as base64 data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ success: true, url: (reader.result as string) || '' });
    };
    reader.onerror = () => {
      resolve({ success: false, url: '' });
    };
    reader.readAsDataURL(file);
  });
}
