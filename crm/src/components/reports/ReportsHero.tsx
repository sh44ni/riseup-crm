import React, { useRef, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  RotateCcw,
  Search,
  X,
  Sparkles,
  Download,
  FileDown,
  Calendar,
  DollarSign,
  Award,
  ChevronDown,
  Sliders,
} from 'lucide-react';
import { DateRangeFilter } from '@/types/reportTypes';
import { useHeroBanner, DefaultBannerText } from '@/lib/heroBannerStore';
import { HeroBannerCustomizerModal } from '@/components/common/HeroBannerCustomizerModal';
import { useToast } from '@/context/ToastContext';

interface ReportsHeroProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const DEFAULT_REPORTS_TEXT: DefaultBannerText = {
  eyebrow: 'Executive Business Intelligence',
  title: 'Executive Analytics & Business Intelligence',
  subtitle: 'Real-time revenue performance, lead source ROI, crew gross margins, and win rates across North County',
};

export function ReportsHero({
  dateRange,
  onDateRangeChange,
  search,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
}: ReportsHeroProps) {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const { activeBanner, saveCustomization, resetPageToDefaults } = useHeroBanner(
    'reports',
    DEFAULT_REPORTS_TEXT
  );

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportCsv = async () => {
    try {
      let from, to;
      if (dateRange === 'ytd') { from = '2026-01-01'; to = '2026-12-31'; }
      else if (dateRange === 'last_30_days') { const d = new Date(); d.setDate(d.getDate() - 30); from = d.toISOString().split('T')[0]; }
      else if (dateRange === 'this_quarter') { from = '2026-07-01'; to = '2026-09-30'; }
      else if (dateRange === 'last_year') { from = '2025-01-01'; to = '2025-12-31'; }
      
      const { api } = await import('@/lib/api');
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
    <>
      <div className="relative rounded-2xl overflow-hidden light-glass-panel border border-white/85 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] h-[220px] min-h-[220px] max-h-[220px] flex flex-col justify-between p-5 lg:p-6 select-none group/hero glossy-sheen">
        {/* Panoramic background image with subtle ambient gradients */}
        <div
          className="absolute inset-0 bg-no-repeat transition-all duration-700 pointer-events-none group-hover/hero:scale-[1.01]"
          style={{
            backgroundImage: `url('${activeBanner.imageUrl}')`,
            backgroundSize: `${activeBanner.zoom}% auto`,
            backgroundPosition: `${activeBanner.positionX}% ${activeBanner.positionY}%`,
            opacity: activeBanner.opacity / 100,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,${
              activeBanner.overlayStrength / 100
            }) 0%, rgba(255,255,255,${(activeBanner.overlayStrength / 100) * 0.85}) 45%, rgba(255,255,255,${
              (activeBanner.overlayStrength / 100) * 0.2
            }) 80%, transparent 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-slate-900/10 pointer-events-none" />

        {/* Hover Customize Button */}
        <div className="absolute top-3 right-3 z-30 opacity-0 group-hover/hero:opacity-100 transition-all duration-200 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-950 text-white text-[11px] font-bold shadow-xl backdrop-blur-md border border-white/20 hover:border-sky-400/60 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Customize Banner Photo, Viewport Framing & Copy"
          >
            <Sliders size={12} className="text-[#38bdf8]" />
            <span>Customize</span>
          </button>
        </div>

        {/* TOP ROW: Title & Action Controls */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Title with Analytics Badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1878B8] via-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-sky-500/25 border border-sky-300/60 shrink-0">
              <BarChart3 size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {activeBanner.title}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100/90 border border-sky-300/80 text-[10px] font-black text-[#0284c7] tracking-wider uppercase">
                  <Sparkles size={10} />
                  Live Feed
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 truncate max-w-xl">
                {activeBanner.subtitle}
              </p>
            </div>
          </div>

        {/* Right Controls: Date Range & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value as DateRangeFilter)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-white/95 border border-slate-200/90 text-xs font-bold text-slate-800 shadow-2xs hover:border-sky-400 focus:outline-none focus:border-[#1878B8] cursor-pointer"
            >
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_quarter">This Quarter (Q3 2026)</option>
              <option value="ytd">Year to Date (YTD 2026)</option>
              <option value="last_year">Full Year 2025</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronDown size={13} />
            </div>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Download Raw CSV"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-glass-btn text-xs font-bold text-slate-800 shadow-2xs hover:border-sky-400 transition-all cursor-pointer"
          >
            <Download size={13} className="text-slate-600" />
            <span>CSV</span>
          </button>

          {/* Export Executive PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white text-xs font-bold shadow-md shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-slate-700/80"
          >
            <FileDown size={14} className="stroke-[2.5]" />
            <span>Executive PDF</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Intelligence Data"
            className="p-2 rounded-xl liquid-glass-btn text-slate-700 hover:text-slate-900 hover:border-sky-400 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw
              size={15}
              className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: Omnisearch & Channel Badges */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
        {/* Omnisearch Bar with ⌘ / Win + K */}
        <div className="w-full max-w-md relative group/search">
          <div className="relative flex items-center rounded-xl bg-white/95 hover:bg-white focus-within:bg-white border border-slate-300/90 hover:border-sky-400 focus-within:border-[#1878B8] shadow-xs px-2.5 py-1.5 backdrop-blur-xl transition-all">
            <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#1878B8] mr-2 shrink-0">
              <Search size={12} className="stroke-[2.5]" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search reports, sales reps, material categories, channels..."
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-500 font-semibold focus:outline-none tracking-wide"
            />

            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                title="Clear search"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors text-xs font-bold cursor-pointer"
              >
                <X size={12} />
              </button>
            )}

            {/* Tactile Keycaps */}
            <div className="hidden sm:flex items-center gap-1 shrink-0 select-none pl-1">
              <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 font-mono shadow-2xs">
                ⌘
              </kbd>
              <span className="text-[10px] text-slate-400">/</span>
              <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[9.5px] font-bold text-slate-700 font-mono shadow-2xs">
                Win
              </kbd>
              <span className="text-[10px] text-slate-400">+</span>
              <kbd className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-sky-50 text-[#0284c7] border border-sky-300 text-[10px] font-black font-mono shadow-2xs">
                K
              </kbd>
            </div>
          </div>
        </div>

        {/* Live Channel Badges */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>YTD Revenue: $1,626,500</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs shrink-0">
            <TrendingUp size={11} className="text-sky-600" />
            <span>+18.4% YoY Expansion</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs shrink-0">
            <Award size={11} className="text-amber-600" />
            <span>68.4% Closing Ratio</span>
          </span>
      </div>
    </div>
  </div>

  {isCustomizerOpen && (
      <HeroBannerCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        pageId="reports"
        activeBanner={activeBanner}
        defaultText={DEFAULT_REPORTS_TEXT}
        onSave={saveCustomization}
        onResetPage={resetPageToDefaults}
      />
    )}
  </>
);
}
