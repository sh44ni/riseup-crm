import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ChevronDown, Download, FileDown, RotateCcw, TrendingUp, Award } from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { ReportsKpis } from '@/components/reports/ReportsKpis';
import { ReportsNavigation } from '@/components/reports/ReportsNavigation';
import { RevenueVelocityTab } from '@/components/reports/RevenueVelocityTab';
import { SalesRepLeaderboardTab } from '@/components/reports/SalesRepLeaderboardTab';
import { DateRangeFilter, ReportTab, dateRangeToDates } from '@/types/reportTypes';
import { useToast } from '@/context/ToastContext';

export function ReportsPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRangeFilter>('this_quarter');
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');
  const [search, setSearch] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [heroKpis, setHeroKpis] = useState<any>(null);

  useEffect(() => {
    async function loadKpis() {
      try {
        const { from, to } = dateRangeToDates(dateRange);
        const res = await api.getReportKpis(from, to);
        if (res?.ok && res.kpis) {
          setHeroKpis(res.kpis);
        }
      } catch (err) {
        console.error('Failed to load hero KPIs:', err);
      }
    }
    loadKpis();
  }, [dateRange, refreshKey]);

  function formatMoney(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${Math.round(val / 1000)}K`;
    return `$${Math.round(val)}`;
  }

  // Global keyboard shortcut: ⌘ / Win + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search reports"]') as HTMLInputElement;
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportCsv = async () => {
    try {
      const { from, to } = dateRangeToDates(dateRange);
      const data = await api.getRevenueReport(from, to);
      const csvContent = `data:text/csv;charset=utf-8,Category,Metric,Value,Period\nRevenue,Booked,$${data.ytdTotal || 0},${dateRange}\nAvg Ticket,Calculated,$${data.avgTicket || 0},${dateRange}\n`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `rise_up_analytics_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics report exported to CSV');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto select-none pb-20">
      {/* 1. Unified 220px Hero Banner with Top Search & Actions */}
      <CrmPageHero
        pageId="reports"
        defaultEyebrow="Executive Business Intelligence • North County"
        defaultTitle="EXECUTIVE ANALYTICS & INTELLIGENCE"
        defaultSubtitle="Real-time revenue performance, lead source ROI, gross margins, and win rates across North County."
        showSearch={true}
        searchPlaceholder="Search reports, sales reps, material categories, channels..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        topRightActions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="h-9 appearance-none pl-3 pr-8 rounded-xl bg-white/95 dark:bg-slate-900 border border-slate-300/90 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs hover:border-sky-400 focus:outline-none focus:border-[#1878B8] cursor-pointer"
              >
                <option value="last_30_days" className="dark:bg-slate-900 dark:text-white">Last 30 Days</option>
                <option value="this_quarter" className="dark:bg-slate-900 dark:text-white">This Quarter (Q3 2026)</option>
                <option value="ytd" className="dark:bg-slate-900 dark:text-white">Year to Date (YTD 2026)</option>
                <option value="last_year" className="dark:bg-slate-900 dark:text-white">Full Year 2025</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                <ChevronDown size={13} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              title="Download Raw CSV"
              className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-2xs hover:border-sky-400 transition-all cursor-pointer"
            >
              <Download size={13} className="text-slate-600 dark:text-slate-400" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <FileDown size={13} />
              <span>Executive PDF</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh Intelligence Data"
              className="w-9 h-9 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-sky-400 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw
                size={14}
                className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin text-sky-600 dark:text-sky-400' : ''}`}
              />
            </button>
          </div>
        }
        bottomRightBadges={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/90 text-[10px] font-bold text-emerald-800 shadow-2xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>YTD Revenue: {heroKpis ? formatMoney(heroKpis.ytdBooked) : '—'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 border border-sky-200/90 text-[10px] font-bold text-sky-800 shadow-2xs shrink-0">
              <TrendingUp size={11} className="text-sky-600" />
              <span>{heroKpis?.bookedRevenueDelta != null ? `${heroKpis.bookedRevenueDelta > 0 ? '+' : ''}${heroKpis.bookedRevenueDelta}% YoY Expansion` : '— YoY Expansion'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 border border-amber-200/90 text-[10px] font-bold text-amber-800 shadow-2xs shrink-0">
              <Award size={11} className="text-amber-600" />
              <span>{heroKpis ? `${heroKpis.winRate}% Closing Ratio` : '—'}</span>
            </span>
          </div>
        }
      />

      {/* 2. 4 Frosted Glass Executive KPI Cards */}
      <ReportsKpis key={`kpis-${refreshKey}`} dateRange={dateRange} />

      {/* 3. Sleek Tab Navigation */}
      <ReportsNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 5. Deep-Dive Viewport by Selected Tab */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'revenue' && <RevenueVelocityTab key={`rev-${refreshKey}`} dateRange={dateRange} />}
        {activeTab === 'sales_reps' && <SalesRepLeaderboardTab key={`reps-${refreshKey}`} dateRange={dateRange} />}
      </div>
    </div>
  );
}

export default ReportsPage;
