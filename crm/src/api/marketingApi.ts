import { api } from '@/lib/api';
import type { MarketingAnalyticsData, MarketingFilterParams } from '@/types/marketingTypes';

/**
 * Fetch full marketing & website analytics dataset
 */
export async function fetchMarketingAnalytics(
  params: MarketingFilterParams = { timeframe: '30d' }
): Promise<MarketingAnalyticsData> {
  const queryParams = new URLSearchParams();

  if (params.timeframe && params.timeframe !== 'custom') {
    queryParams.set('timeframe', params.timeframe);
  } else if (params.from && params.to) {
    queryParams.set('from', params.from);
    queryParams.set('to', params.to);
  } else if (params.hours) {
    queryParams.set('hours', String(params.hours));
  } else if (params.days) {
    queryParams.set('days', String(params.days));
  } else {
    queryParams.set('timeframe', '30d');
  }

  const queryString = queryParams.toString();
  const endpoint = `/admin/marketing/analytics${queryString ? `?${queryString}` : ''}`;
  
  return api.request<MarketingAnalyticsData>(endpoint);
}

/**
 * Fetch call conversion telemetry
 */
export async function fetchMarketingCalls(days = 30) {
  return api.request(`/admin/marketing/calls?days=${days}`);
}

/**
 * Fetch heatmap and scroll depth data
 */
export async function fetchMarketingHeatmap(page = '/', days = 30) {
  const query = new URLSearchParams({ page, days: String(days) }).toString();
  return api.request(`/admin/marketing/heatmap?${query}`);
}
