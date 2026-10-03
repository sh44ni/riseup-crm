/**
 * Per-user UI customizations (hero banners, quote banner, weather widget, sidebar photo).
 * The server is the only source of truth; nothing is cached in localStorage.
 */
import { httpClient } from '@/shared/api/client';

// One-time cleanup of the legacy device-only customization keys (server is now the source of truth).
if (typeof window !== 'undefined') {
  try {
    for (const key of ['crm_hero_banner_config', 'crm_quote_banner_config', 'crm_weather_widget_config', 'crm_sidebar_bg']) {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage may be unavailable
  }
}

export type CustomizationMap = Record<string, Record<string, unknown>>;

export interface UploadedImage {
  url: string;
  content_type?: string;
  size_bytes?: number;
  width?: number | null;
  height?: number | null;
}

interface MapEnvelope {
  success?: boolean;
  data?: CustomizationMap;
}

export const MY_CUSTOMIZATIONS_KEY = ['my-customizations'] as const;

export async function fetchMyCustomizations(): Promise<CustomizationMap> {
  const res = await httpClient.get<MapEnvelope>('/admin/me/customizations');
  return res?.data ?? {};
}

export async function saveMyCustomization(
  slotKey: string,
  body: Record<string, unknown>
): Promise<CustomizationMap> {
  const res = await httpClient.put<MapEnvelope>(
    `/admin/me/customizations/${encodeURIComponent(slotKey)}`,
    body
  );
  return res?.data ?? {};
}

export async function resetMyCustomization(slotKey: string): Promise<CustomizationMap> {
  const res = await httpClient.delete<MapEnvelope>(
    `/admin/me/customizations/${encodeURIComponent(slotKey)}`
  );
  return res?.data ?? {};
}

export async function uploadCustomizationImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await httpClient.post<{ data?: UploadedImage }>(
    '/admin/me/customizations/upload',
    formData
  );
  if (!res?.data?.url) throw new Error('Upload failed');
  return res.data;
}
