import React, { useState, useMemo } from 'react';
import {
  Activity,
  PhoneCall,
  Send,
  Edit3,
  MousePointerClick,
  Compass,
  Eye,
  ChevronsDown,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import type { ActivityFeedItem } from '@/types/marketingTypes';

interface MarketingActivityFeedProps {
  activityFeed: ActivityFeedItem[];
  loading?: boolean;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
}

function formatTimeAgo(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const MarketingActivityFeed: React.FC<MarketingActivityFeedProps> = ({
  activityFeed,
  loading,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredFeed = useMemo(() => {
    if (!activityFeed) return [];
    if (filterType === 'all') return activityFeed;
    if (filterType === 'calls') return activityFeed.filter((a) => a.event_type === 'call');
    if (filterType === 'forms') {
      return activityFeed.filter((a) => a.event_type.startsWith('form'));
    }
    if (filterType === 'clicks') {
      return activityFeed.filter((a) => a.event_type.includes('click'));
    }
    if (filterType === 'pageviews') return activityFeed.filter((a) => a.event_type === 'pageview');
    return activityFeed;
  }, [activityFeed, filterType]);

  const renderEventBadge = (item: ActivityFeedItem) => {
    const et = item.event_type.toLowerCase();

    if (et === 'call') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs">
          <PhoneCall size={9} className="stroke-[2.5]" />
          Phone Call
        </span>
      );
    }
    if (et === 'form_submit' || et === 'estimate_submit' || et === 'contact_submit') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/60 shadow-2xs">
          <Send size={9} className="stroke-[2.5]" />
          Form Submitted
        </span>
      );
    }
    if (et === 'form_start') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-sky-50/90 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/90 dark:border-sky-800/60 shadow-2xs">
          <Edit3 size={9} className="stroke-[2.5]" />
          Form Started
        </span>
      );
    }
    if (et === 'button_click') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/60 shadow-2xs">
          <MousePointerClick size={9} className="stroke-[2.5]" />
          Button Click
        </span>
      );
    }
    if (et === 'nav_click') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50/90 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/90 dark:border-purple-800/60 shadow-2xs">
          <Compass size={9} className="stroke-[2.5]" />
          Nav Click
        </span>
      );
    }
    if (et === 'scroll') {
      return (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-2xs">
          <ChevronsDown size={9} className="stroke-[2.5]" />
          {item.scroll_pct ? `Scroll ${item.scroll_pct}%` : 'Scroll'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50/90 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/60 shadow-2xs">
        <Eye size={9} className="stroke-[2.5]" />
        Pageview
      </span>
    );
  };

  const renderDeviceIcon = (device?: string | null) => {
    const d = (device || 'desktop').toLowerCase();
    if (d === 'mobile') return <Smartphone size={11} className="text-slate-400" />;
    if (d === 'tablet') return <Tablet size={11} className="text-slate-400" />;
    return <Monitor size={11} className="text-slate-400" />;
  };

  return (
    <div className="light-glass-panel dark:bg-slate-900/60 rounded-2xl border border-white/85 dark:border-white/10 shadow-sm backdrop-blur-2xl p-4 md:p-5 select-none flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-white shadow-xs">
            <Activity size={14} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Live Website Activity Stream
              </h3>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-2xs" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Real-time visitor interactions & events</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {onToggleAutoRefresh && (
            <button
              type="button"
              onClick={onToggleAutoRefresh}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all ${
                autoRefresh
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:text-slate-900 hover:dark:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              Auto 15s
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white hover:dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-slate-200/40 dark:border-white/10">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'calls', label: 'Calls' },
          { id: 'forms', label: 'Forms' },
          { id: 'clicks', label: 'Clicks' },
          { id: 'pageviews', label: 'Pageviews' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold transition-all shrink-0 ${
              filterType === tab.id
                ? 'bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white border border-slate-200/60 dark:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200/40 dark:divide-white/5 pr-1 mt-1">
        {loading && filteredFeed.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-medium">
            Fetching telemetry events...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
            <Activity size={22} className="mb-1 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No events found</p>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500">Try choosing a different event filter or date range</p>
          </div>
        ) : (
          filteredFeed.map((item, idx) => {
            const loc = [item.city, item.country].filter(Boolean).join(', ');
            return (
              <div
                key={item.id || idx}
                className="py-2 px-1 hover:bg-white/60 hover:dark:bg-slate-800/40 rounded-xl transition-colors flex items-start justify-between gap-2.5 text-xs"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="mt-0.5 shrink-0">{renderEventBadge(item)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-[10.5px] bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 px-1.5 py-0.2 rounded truncate max-w-[220px]">
                        {item.page_path}
                      </span>
                      {item.label && item.label !== 'Phone Call' && (
                        <span className="text-slate-600 dark:text-slate-300 font-bold truncate max-w-[180px] text-[10.5px]">
                          "{item.label}"
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {item.device_type && (
                        <span className="flex items-center gap-1 capitalize">
                          {renderDeviceIcon(item.device_type)}
                          <span>{item.device_type}</span>
                        </span>
                      )}
                      {loc && (
                        <>
                          {item.device_type && <span>•</span>}
                          <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                            <MapPin size={9} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{loc}</span>
                          </span>
                        </>
                      )}
                      {item.utm_source && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-700 dark:text-indigo-300 font-bold uppercase text-[8.5px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-1 rounded">
                            {item.utm_source}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 justify-end">
                    <Clock size={9} />
                    {formatTimeAgo(item.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
