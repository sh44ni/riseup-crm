import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { fetchMarketingAnalytics, fetchSpamShield } from '@/api/marketingApi';
import type { MarketingAnalyticsData, MarketingTimeframe, SpamShieldData } from '@/types/marketingTypes';
import { MarketingKpiCards } from '@/components/marketing/MarketingKpiCards';
import { MarketingTrafficChart } from '@/components/marketing/MarketingTrafficChart';
import { MarketingSourcesCard } from '@/components/marketing/MarketingSourcesCard';
import { MarketingCallsCard } from '@/components/marketing/MarketingCallsCard';
import { MarketingPagesTable } from '@/components/marketing/MarketingPagesTable';
import { MarketingActivityFeed } from '@/components/marketing/MarketingActivityFeed';
import { MarketingSpamShieldKpis } from '@/components/marketing/MarketingSpamShieldKpis';
import { MarketingSpamTimeline } from '@/components/marketing/MarketingSpamTimeline';
import { MarketingSpamBreakdown } from '@/components/marketing/MarketingSpamBreakdown';
import { MarketingSpamFeed } from '@/components/marketing/MarketingSpamFeed';

const TIMEFRAME_OPTIONS: { id: MarketingTimeframe; label: string; short: string }[] = [
  { id: '2h', label: 'Last 2 Hours', short: '2h' },
  { id: '24h', label: 'Past 24 Hours', short: '24h' },
  { id: '7d', label: 'Last 7 Days', short: '7d' },
  { id: '30d', label: 'Last 30 Days', short: '30d' },
  { id: '90d', label: 'Last 90 Days', short: '90d' },
  { id: 'ytd', label: 'Year to Date', short: 'YTD' },
  { id: '365d', label: 'Last 1 Year', short: '1Y' },
  { id: '730d', label: 'Last 2 Years', short: '2Y' },
  { id: 'custom', label: 'Custom Range', short: 'Custom' },
];

export const MarketingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'traffic' | 'shield'>('traffic');
  const [timeframe, setTimeframe] = useState<MarketingTimeframe>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [data, setData] = useState<MarketingAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const [spamData, setSpamData] = useState<SpamShieldData | null>(null);
  const [spamLoading, setSpamLoading] = useState<boolean>(false);

  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (timeframe === 'custom') {
        if (customFrom && customTo) {
          params.from = customFrom;
          params.to = customTo;
        } else {
          params.timeframe = '30d';
        }
      } else {
        params.timeframe = timeframe;
      }

      const res = await fetchMarketingAnalytics(params);
      setData(res);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load marketing analytics:', err);
      setError(err?.message || 'Failed to fetch telemetry data from server');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [timeframe, customFrom, customTo]);

  const loadSpamShield = useCallback(async (isSilent = false) => {
    if (!isSilent) setSpamLoading(true);
    try {
      const params: any = {};
      if (timeframe === 'custom') {
        if (customFrom && customTo) {
          params.from = customFrom;
          params.to = customTo;
        } else {
          params.timeframe = '30d';
        }
      } else {
        params.timeframe = timeframe;
      }
      const res = await fetchSpamShield(params);
      setSpamData(res);
    } catch (err: any) {
      console.warn('Failed to load spam shield telemetry:', err);
    } finally {
      if (!isSilent) setSpamLoading(false);
    }
  }, [timeframe, customFrom, customTo]);

  useEffect(() => {
    loadAnalytics(false);
    loadSpamShield(true);
  }, [loadAnalytics, loadSpamShield]);

  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        if (activeTab === 'traffic') {
          loadAnalytics(true);
        } else {
          loadSpamShield(true);
        }
      }, 30000);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, activeTab, loadAnalytics, loadSpamShield]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFrom && customTo) {
      setTimeframe('custom');
      setShowCustomPicker(false);
      loadAnalytics(false);
      loadSpamShield(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'traffic') {
      loadAnalytics(false);
    } else {
      loadSpamShield(false);
    }
  };

  // Filter top pages and activity if search query entered
  const filteredPages = (data?.topPages || []).filter((p) =>
    searchQuery ? p.page_path.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const filteredActivity = (data?.activityFeed || []).filter((a) =>
    searchQuery
      ? a.page_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.label && a.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  return (
    <div className="space-y-2.5 max-w-[1600px] mx-auto select-none pb-16">
      {/* 1. UNIFIED 220PX HERO BANNER */}
      <CrmPageHero
        pageId="marketing"
        defaultEyebrow="Discipline Builds Freedom • North County San Diego"
        defaultTitle="WEB & MARKETING ANALYTICS"
        defaultSubtitle="Real-time website traffic, phone calls clicked, bounce rate, lead attribution, and visitor behavior."
        showSearch={true}
        searchPlaceholder="Search pages, labels, or telemetry..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery('')}
        bottomRightBadges={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>100% Live Telemetry</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 dark:bg-sky-950/60 border border-sky-200/90 dark:border-sky-800/60 text-[10px] font-bold text-sky-800 dark:text-sky-300 shadow-2xs shrink-0">
              <TrendingUp size={11} className="text-sky-600 dark:text-sky-400" />
              <span>{data?.totalPageviews?.toLocaleString() ?? 0} Views</span>
            </span>
            <Link
              to="/leads"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 hover:bg-amber-100/90 dark:bg-amber-950/60 hover:dark:bg-amber-900/60 border border-amber-200/90 dark:border-amber-800/60 text-[10px] font-bold text-amber-800 dark:text-amber-300 shadow-2xs shrink-0 transition-colors"
            >
              <span>{data?.websiteLeadsCount ?? 0} Website Leads</span>
              <ArrowUpRight size={10} />
            </Link>
            <button
              type="button"
              onClick={() => setActiveTab('shield')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold shadow-2xs shrink-0 transition-colors cursor-pointer ${
                activeTab === 'shield'
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/60 hover:dark:bg-rose-900/60 border-rose-200/90 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
              }`}
              title="View Bot Shield & Honeypot Health"
            >
              <ShieldCheck size={11} className={activeTab === 'shield' ? 'text-white' : 'text-rose-600 dark:text-rose-400'} />
              <span>{spamData?.totalBlocked ?? 0} Bots Blocked</span>
            </button>
            <a
              href="https://riseuprac.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white dark:bg-slate-800/80 hover:dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs shrink-0 transition-colors"
            >
              <Globe size={11} className="text-[#1878B8]" />
              <span>riseuprac.com</span>
            </a>
          </div>
        }
      />

      {/* 2. TIMEFRAME PRESETS & STATUS TOOLBAR */}
      <div className="light-glass-card dark:bg-slate-900/60 dark:border dark:border-white/10 glossy-sheen rounded-xl p-1.5 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
        {/* Presets */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const active = timeframe === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (opt.id === 'custom') {
                    setShowCustomPicker(true);
                  } else {
                    setTimeframe(opt.id);
                    setShowCustomPicker(false);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-tr from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white hover:bg-white/60 hover:dark:bg-slate-800/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto text-xs text-slate-500 dark:text-slate-400 pr-1">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs'
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            <span>Live Stream</span>
          </button>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || spamLoading}
            className="p-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white hover:dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw size={12} className={(loading || spamLoading) ? 'animate-spin text-[#1878B8]' : ''} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Modal */}
      {showCustomPicker && (
        <div className="light-glass-card dark:bg-slate-900/90 glossy-sheen rounded-xl p-3 border border-sky-300/80 dark:border-sky-700/80 shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleApplyCustom} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
              <Calendar size={14} className="text-[#1878B8]" />
              <span>Custom Date Window:</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-[#1878B8] hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Apply Range
              </button>
              <button
                type="button"
                onClick={() => setShowCustomPicker(false)}
                className="px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white hover:dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadAnalytics(false)}
            className="text-rose-700 dark:text-rose-300 font-bold underline hover:text-rose-900 hover:dark:text-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. TAB SELECTION BAR */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 p-1 rounded-xl border border-white/80 dark:border-white/10 backdrop-blur-md text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('traffic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'traffic'
                ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <TrendingUp size={13} />
            <span>Traffic &amp; Conversion Telemetry</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('shield');
              if (!spamData) loadSpamShield(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'shield'
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Bot Shield &amp; Honeypots</span>
            {spamData && spamData.totalBlocked > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  activeTab === 'shield'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {spamData.totalBlocked.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENT: TRAFFIC & LEADS TELEMETRY */}
      {activeTab === 'traffic' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          {/* A. KPI METRIC CARDS ROW (5 Executive Glass Cards) */}
          <MarketingKpiCards data={data} loading={loading} />

          {/* B. TRAFFIC VELOCITY OVER TIME */}
          <MarketingTrafficChart
            timeline={data?.timeline || []}
            isHourly={data?.isHourly}
            isMonthly={data?.isMonthly}
            loading={loading}
          />

          {/* C. CALLS & SOURCES DUAL COLUMNS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            <MarketingCallsCard
              totalCalls={data?.totalCalls || 0}
              callConversionRate={data?.callConversionRate || 0}
              callsByPage={data?.callsByPage || []}
              callsByHour={data?.callsByHour || []}
              topButtons={data?.topButtons || []}
            />

            <MarketingSourcesCard
              sources={data?.utmSources || []}
              referrers={data?.referrers || []}
              devices={data?.deviceBreakdown || []}
              totalSessions={data?.totalSessions || 0}
            />
          </div>

          {/* D. TOP PAGES & LIVE ACTIVITY DUAL COLUMNS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            <MarketingPagesTable
              topPages={filteredPages}
              totalPageviews={data?.totalPageviews || 0}
            />

            <MarketingActivityFeed
              activityFeed={filteredActivity}
              loading={loading}
              onRefresh={() => loadAnalytics(false)}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            />
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: BOT SHIELD & HONEYPOT HEALTH */}
      {activeTab === 'shield' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          {/* A. 5 BOT SHIELD KPI CARDS */}
          <MarketingSpamShieldKpis data={spamData} loading={spamLoading} />

          {/* B. INTERCEPTION TIMELINE */}
          <MarketingSpamTimeline
            timeline={spamData?.timeline || []}
            loading={spamLoading}
          />

          {/* C. ATTACK VECTORS & OFFENDERS DUAL COLUMNS */}
          <MarketingSpamBreakdown
            reasons={spamData?.blockReasonBreakdown || []}
            formTypes={spamData?.formTypeBreakdown || []}
            topIps={spamData?.topIps || []}
            totalBlocked={spamData?.totalBlocked || 0}
          />

          {/* D. LIVE QUARANTINED ATTEMPTS FEED */}
          <MarketingSpamFeed
            recentAttempts={spamData?.recentAttempts || []}
            loading={spamLoading}
            onRefresh={() => loadSpamShield(false)}
          />
        </div>
      )}
    </div>
  );
};
