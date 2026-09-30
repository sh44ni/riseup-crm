import React, { useState } from 'react';
import { Search, X, Pencil } from 'lucide-react';
import { useHeroBanner, DefaultBannerText } from '@/lib/heroBannerStore';
import { HeroBannerCustomizerModal } from './HeroBannerCustomizerModal';
import { useTheme } from '@/context/ThemeContext';

export interface CrmPageHeroProps {
  pageId: string;
  defaultEyebrow: string;
  defaultTitle: string;
  defaultSubtitle: string;
  // Compact viewport mode for non-scrollable dashboards
  compact?: boolean;
  // Search Bar options
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  // Action Buttons & View Mode toggles
  topRightActions?: React.ReactNode;
  // Live metric / channel badges
  bottomRightBadges?: React.ReactNode;
  // Optional custom slots for specialized pages
  customTopRow?: React.ReactNode;
  customBottomRow?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  minHeight?: string;
}

export function CrmPageHero({
  pageId,
  defaultEyebrow,
  defaultTitle,
  defaultSubtitle,
  compact = false,
  showSearch = true,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  onSearchClear,
  searchRef,
  topRightActions,
  bottomRightBadges,
  customTopRow,
  customBottomRow,
  children,
  className = '',
  minHeight = 'min-h-[220px]',
}: CrmPageHeroProps) {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const { isDark } = useTheme();

  const defaultText: DefaultBannerText = {
    eyebrow: defaultEyebrow,
    title: defaultTitle,
    subtitle: defaultSubtitle,
  };

  const { activeBanner, saveCustomization, resetPageToDefaults } = useHeroBanner(
    pageId,
    defaultText
  );

  return (
    <>
      <div
        className={`relative rounded-2xl overflow-hidden light-glass-panel border border-white/85 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] ${
          compact
            ? 'h-[128px] min-h-[128px] max-h-[128px] p-3.5 lg:px-5 lg:py-3.5'
            : 'h-[220px] min-h-[220px] max-h-[220px] p-5 lg:p-6'
        } flex flex-col justify-between select-none group/hero glossy-sheen ${className}`}
      >
        {/* ========================================================
            1. DYNAMIC CROPPED PANORAMA BACKGROUND IMAGE
            ======================================================== */}
        <div
          className="absolute inset-0 bg-no-repeat transition-all duration-700 pointer-events-none group-hover/hero:scale-[1.01]"
          style={{
            backgroundImage: `url('${activeBanner.imageUrl}')`,
            backgroundSize: `${activeBanner.zoom}% auto`,
            backgroundPosition: `${activeBanner.positionX}% ${activeBanner.positionY}%`,
            opacity: activeBanner.opacity / 100,
          }}
        />

        {/* Ambient Pearl Liquid Glass Gradient Wash for Optimum Readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? `linear-gradient(to right, rgba(7,12,21,${
                  activeBanner.overlayStrength / 100
                }) 0%, rgba(7,12,21,${(activeBanner.overlayStrength / 100) * 0.85}) 45%, rgba(7,12,21,${
                  (activeBanner.overlayStrength / 100) * 0.3
                }) 80%, transparent 100%)`
              : `linear-gradient(to right, rgba(255,255,255,${
                  activeBanner.overlayStrength / 100
                }) 0%, rgba(255,255,255,${(activeBanner.overlayStrength / 100) * 0.85}) 45%, rgba(255,255,255,${
                  (activeBanner.overlayStrength / 100) * 0.2
                }) 80%, transparent 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 dark:from-slate-950/40 via-transparent to-black/10 dark:to-black/50 pointer-events-none" />

        {/* ========================================================
            2. TOP ROW: Search Bar + [Pencil Customize] + Action Buttons
            ======================================================== */}
        {customTopRow ? (
          <div className="relative z-10">{customTopRow}</div>
        ) : (
          <div className="relative z-10 flex items-center justify-between gap-4">
            {/* Omnisearch Bar with ⌘ / Win + K Keycaps */}
            {showSearch && onSearchChange && (
              <div className="w-full max-w-lg relative group/search">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-400/25 via-[#1878B8]/20 to-cyan-400/25 opacity-0 group-hover/search:opacity-100 group-focus-within/search:opacity-100 blur-md transition-all duration-300 pointer-events-none" />

                <div className="relative flex items-center rounded-xl bg-white/95 dark:bg-[#0B1320]/85 hover:bg-white dark:hover:bg-[#0E182A] focus-within:bg-white dark:focus-within:bg-[#0E182A] border border-slate-300/90 dark:border-white/12 hover:border-sky-400 dark:hover:border-sky-500/50 focus-within:border-[#1878B8] dark:focus-within:border-sky-400 shadow-[0_2px_12px_rgba(15,23,42,0.06),inset_0_1.5px_1px_rgba(255,255,255,1)] dark:shadow-[0_2px_14px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all duration-200 px-2.5 py-1.5 backdrop-blur-xl">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-center text-[#1878B8] dark:text-sky-400 group-focus-within/search:bg-gradient-to-tr group-focus-within/search:from-[#1878B8] group-focus-within/search:to-[#55C4F5] group-focus-within/search:text-white group-focus-within/search:border-transparent transition-all shrink-0">
                    <Search size={13} className="stroke-[2.5]" />
                  </div>

                  <input
                    ref={searchRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-2.5 pr-2 py-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:outline-none tracking-wide"
                  />

                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange('');
                        if (onSearchClear) onSearchClear();
                      }}
                      title="Clear search"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 mr-1 transition-colors text-xs font-bold cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}

                  {/* Tactile Keycaps */}
                  <div className="flex items-center gap-1 shrink-0 select-none pl-1 pr-0.5">
                    <kbd
                      title="Mac: Command + K"
                      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono shadow-2xs group-focus-within/search:border-sky-300"
                    >
                      ⌘
                    </kbd>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">/</span>
                    <kbd
                      title="Windows: Windows + K"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 font-mono shadow-2xs group-focus-within/search:border-sky-300"
                    >
                      <svg className="w-2.5 h-2.5 fill-[#0078D4] shrink-0" viewBox="0 0 88 88">
                        <path d="M0 12.402l35.687-4.86.016 34.423-35.67.203zm35.67 33.529l.028 34.453L.028 75.48.016 45.728zm4.326-39.043L87.914 0v41.527l-47.918.283zm47.929 41.258L88 88l-48.004-6.787V46.037z" />
                      </svg>
                      <span>Win</span>
                    </kbd>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">+</span>
                    <kbd className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-b from-sky-50 to-sky-100 dark:from-sky-950/80 dark:to-sky-900/80 text-[#0284c7] dark:text-sky-300 border border-sky-300 dark:border-sky-700 text-[10px] font-black font-mono shadow-2xs">
                      K
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* Top-Right Controls: [Pencil Customize Button] on the left of other buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Customize Button (placed on the left of other buttons) */}
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(true)}
                className="w-9 h-9 rounded-xl bg-slate-900/85 hover:bg-slate-950 text-white flex items-center justify-center shadow-md backdrop-blur-md border border-white/20 hover:border-sky-400/80 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-0 group-hover/hero:opacity-100"
                title="Customize Banner Photo, Viewport Framing & Copy"
              >
                <Pencil size={13} className="text-[#38bdf8]" />
              </button>

              {/* Page-Specific Action Buttons */}
              {topRightActions}
            </div>
          </div>
        )}

        {/* Custom Body Children if provided */}
        {children && <div className="relative z-10">{children}</div>}

        {/* ========================================================
            4. BOTTOM ROW: Title & Live Channel Badges
            ======================================================== */}
        {customBottomRow ? (
          <div className="relative z-10">{customBottomRow}</div>
        ) : (
          <div className={`relative z-10 flex items-end justify-between gap-4 flex-wrap ${compact ? 'pt-1' : 'pt-4'}`}>
            <div className="max-w-2xl">
              <div className={`flex items-center gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
                <span className="w-2 h-2 rounded-full bg-[#1878B8] shadow-[0_0_8px_#55C4F5] animate-pulse" />
                <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} tracking-[0.24em] font-extrabold uppercase text-[#1878B8]`}>
                  {activeBanner.eyebrow}
                </span>
              </div>
              <h1 className={`${compact ? 'text-lg lg:text-xl' : 'text-2xl lg:text-3xl'} font-black tracking-tight text-[#1F1F1F] dark:text-white leading-tight`}>
                {activeBanner.title}
              </h1>
              <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-tight truncate max-w-xl`}>
                {activeBanner.subtitle}
              </p>
            </div>

            {/* Real-time Ticker / Metric Badges */}
            {bottomRightBadges && (
              <div className="flex items-center gap-2 flex-wrap pb-0.5">{bottomRightBadges}</div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          5. MODAL INSTANCE
          ======================================================== */}
      {isCustomizerOpen && (
        <HeroBannerCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          pageId={pageId}
          activeBanner={activeBanner}
          defaultText={defaultText}
          onSave={saveCustomization}
          onResetPage={resetPageToDefaults}
        />
      )}
    </>
  );
}

export default CrmPageHero;
