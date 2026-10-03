import { httpClient } from '@/shared/api/client';
import type {
  ActivityDetail,
  ActivityFilterOptions,
  ActivityFilters,
  ActivityPage,
  ActivitySummary,
} from './types';

export function filtersToQuery(filters: ActivityFilters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim());
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const activityApi = {
  list(filters: ActivityFilters, cursor?: string | null): Promise<ActivityPage> {
    return httpClient.get<ActivityPage>(
      `/admin/activity${filtersToQuery(filters, { limit: '50', ...(cursor ? { cursor } : {}) })}`,
    );
  },
  detail(id: number): Promise<{ data: ActivityDetail }> {
    return httpClient.get(`/admin/activity/${id}`);
  },
  summary(days = 7): Promise<ActivitySummary> {
    return httpClient.get<ActivitySummary>(`/admin/activity/summary?days=${days}`);
  },
  filterOptions(): Promise<ActivityFilterOptions> {
    return httpClient.get<ActivityFilterOptions>('/admin/activity/filters');
  },
  /** Downloads the filtered CSV (cookie/bearer auth, so fetch + blob rather than a bare link). */
  async exportCsv(filters: ActivityFilters): Promise<void> {
    const res = await fetch(`/api/admin/activity/export.csv${filtersToQuery(filters)}`, {
      credentials: 'include',
      headers: httpClient.getAuthHeaders('GET'),
    });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
