import React, { useRef, useState } from 'react';
import {
  CheckSquare,
  Plus,
  RotateCcw,
  Search,
  X,
  Sparkles,
  Clock,
  CheckCircle2,
  FileText,
  Sliders,
} from 'lucide-react';
import { useHeroBanner, DefaultBannerText } from '@/lib/heroBannerStore';
import { HeroBannerCustomizerModal } from '@/components/common/HeroBannerCustomizerModal';

interface TasksHeroProps {
  search: string;
  onSearchChange: (val: string) => void;
  onOpenNewTask: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  slaPercentage?: number;
}

const DEFAULT_TASKS_TEXT: DefaultBannerText = {
  eyebrow: 'Tasks & Operations Hub',
  title: 'Tasks & Operations',
  subtitle: 'Manage company-wide operations, client follow-ups, and personal sticky notes',
};

export function TasksHero({
  search,
  onSearchChange,
  onOpenNewTask,
  onRefresh,
  isRefreshing = false,
  slaPercentage = 100,
}: TasksHeroProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const { activeBanner, saveCustomization, resetPageToDefaults } = useHeroBanner(
    'tasks',
    DEFAULT_TASKS_TEXT
  );

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden light-glass-panel border border-white/85 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] h-[220px] min-h-[220px] max-h-[220px] flex flex-col justify-between p-5 lg:p-6 select-none group/hero glossy-sheen">
        {/* Background panoramic image with ambient gradient overlay */}
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

        {/* TOP ROW: Title & Action Buttons Matching Mockup */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left Title with Yellow Checkbox Icon from Mockup */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300/80 shrink-0">
              <CheckSquare size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {activeBanner.title}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/90 border border-amber-300/80 text-[10px] font-black text-amber-900 tracking-wider uppercase">
                  <Sparkles size={10} />
                  Live Hub
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 truncate max-w-xl">
                {activeBanner.subtitle}
              </p>
            </div>
          </div>

          {/* Right Top Actions Matching Mockup */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh tasks"
              className="p-2 rounded-xl liquid-glass-btn text-slate-700 hover:text-slate-900 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw
                size={15}
                className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`}
              />
            </button>

            {/* Golden Amber + New Task Button Matching Mockup */}
            <button
              type="button"
              onClick={onOpenNewTask}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-amber-300/80"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: Omnisearch & Channel Badges */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          {/* Omnisearch Bar with ⌘ / Win + K */}
          <div className="w-full max-w-md relative group/search">
            <div className="relative flex items-center rounded-xl bg-white/95 hover:bg-white focus-within:bg-white border border-slate-300/90 hover:border-amber-400 focus-within:border-amber-500 shadow-xs px-2.5 py-1.5 backdrop-blur-xl transition-all">
              <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 mr-2 shrink-0">
                <Search size={12} className="stroke-[2.5]" />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tasks, clients, estimate follow-ups, assignees..."
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
                <kbd className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-black font-mono shadow-2xs">
                  K
                </kbd>
              </div>
            </div>
          </div>

          {/* Live Channel Badges */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
              <CheckCircle2 size={11} className="text-emerald-600" />
              <span>SLA: {slaPercentage}% On-Time Follow-up</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs shrink-0">
              <FileText size={11} className="text-sky-600" />
              <span>Estimates Auto-Synced</span>
            </span>
          </div>
        </div>
      </div>

      {isCustomizerOpen && (
        <HeroBannerCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          pageId="tasks"
          activeBanner={activeBanner}
          defaultText={DEFAULT_TASKS_TEXT}
          onSave={saveCustomization}
          onResetPage={resetPageToDefaults}
        />
      )}
    </>
  );
}
