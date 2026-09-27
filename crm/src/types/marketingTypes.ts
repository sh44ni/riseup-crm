export type MarketingTimeframe = 
  | '2h' 
  | '24h' 
  | '7d' 
  | '30d' 
  | '90d' 
  | 'ytd' 
  | '365d' 
  | '730d' 
  | 'custom';

export interface TimelineDataPoint {
  day: string;
  label: string;
  pageviews: number;
  sessions: number;
}

export interface TopPageItem {
  page_path: string;
  views: number;
  sessions: number;
}

export interface DeviceCountItem {
  device_type: string;
  count: number;
}

export interface ReferrerCountItem {
  referrer: string;
  count: number;
}

export interface LocationCountItem {
  country?: string;
  city?: string;
  count: number;
}

export interface HourlyCountItem {
  hour: number;
  count: number;
}

export interface WeekdayCountItem {
  dow: number;
  label: string;
  count: number;
}

export interface EventTypeCountItem {
  event_type: string;
  count: number;
}

export interface TopButtonItem {
  label: string;
  count: number;
}

export interface ActivityFeedItem {
  id: number | string;
  session_id: string;
  event_type: string;
  page_path: string;
  label?: string | null;
  element?: string | null;
  device_type?: string | null;
  country?: string | null;
  city?: string | null;
  scroll_pct?: number | null;
  duration_ms?: number | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  created_at: string;
}

export interface UtmSourceItem {
  utm_source: string;
  count: number;
}

export interface CallsByPageItem {
  page_path: string;
  count: number;
}

export interface MarketingAnalyticsData {
  dailyPageviews: TimelineDataPoint[];
  timeline: TimelineDataPoint[];
  isHourly: boolean;
  isMonthly: boolean;
  topPages: TopPageItem[];
  deviceBreakdown: DeviceCountItem[];
  referrers: ReferrerCountItem[];
  countries: LocationCountItem[];
  cities: LocationCountItem[];
  hourlyHeatmap: HourlyCountItem[];
  weekdayTraffic: WeekdayCountItem[];
  eventTypeBreakdown: EventTypeCountItem[];
  topButtons: TopButtonItem[];
  activityFeed: ActivityFeedItem[];
  utmSources: UtmSourceItem[];
  callsByHour: HourlyCountItem[];
  callsByPage: CallsByPageItem[];
  totalCalls: number;
  bounceRate: number;
  avgScrollDepth: number;
  avgDurationMs: number;
  conversionRate: number;
  callConversionRate: number;
  totalSessions: number;
  totalPageviews: number;
  uniqueVisitors: number;
  websiteLeadsCount: number;
  allLeadsCount: number;
}

export interface MarketingFilterParams {
  timeframe?: MarketingTimeframe;
  days?: number;
  hours?: number;
  from?: string;
  to?: string;
}
