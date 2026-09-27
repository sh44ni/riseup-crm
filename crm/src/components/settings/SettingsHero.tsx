import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Save,
  RotateCcw,
  Download,
  Search,
  CheckCircle2,
  User,
  Users,
  Building2,
  Calculator,
  Sliders,
  Bell,
  Cpu,
} from 'lucide-react';
import { SettingsTab } from '@/types/settingsTypes';
import { useHeroBanner, DefaultBannerText } from '@/lib/heroBannerStore';
import { HeroBannerCustomizerModal } from '@/components/common/HeroBannerCustomizerModal';

interface SettingsHeroProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  search: string;
  onSearchChange: (query: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onExport: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const DEFAULT_SETTINGS_TEXT: DefaultBannerText = {
  eyebrow: 'Operations & Infrastructure',
  title: 'Business Settings & Team Suite',
  subtitle: 'Centralized operations, contractor licensing, estimator pitch multipliers, and team user roles',
};

export function SettingsHero({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onSave,
  onDiscard,
  onExport,
  isSaving,
  hasUnsavedChanges,
}: SettingsHeroProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const { activeBanner, saveCustomization, resetPageToDefaults } = useHeroBanner(
    'settings',
    DEFAULT_SETTINGS_TEXT
  );

  const handleSaveClick = () => {
    onSave();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2400);
  };

  const TAB_SHORTCUTS: { tab: SettingsTab; label: string; icon: any }[] = [
    { tab: 'profile', label: 'My Profile', icon: User },
    { tab: 'users', label: 'Team & Users', icon: Users },
    { tab: 'company', label: 'Company & CSLB', icon: Building2 },
    { tab: 'pricing', label: 'Roofing Pricing', icon: Calculator },
  ];

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden light-glass-panel border border-white/85 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] h-[220px] min-h-[220px] max-h-[220px] flex flex-col justify-between p-5 lg:p-6 select-none group/hero glossy-sheen">
        {/* 1. Dynamic Cropped Panorama Background Image */}
        <div
          className="absolute inset-0 bg-no-repeat transition-all duration-700 pointer-events-none group-hover/hero:scale-[1.01]"
          style={{
            backgroundImage: `url('${activeBanner.imageUrl}')`,
            backgroundSize: `${activeBanner.zoom}% auto`,
            backgroundPosition: `${activeBanner.positionX}% ${activeBanner.positionY}%`,
            opacity: activeBanner.opacity / 100,
          }}
        />

        {/* 2. Ambient Pearl Liquid Glass Gradient Wash for Optimum Readability */}
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

        {/* 3. Hover Customize Button */}
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

        {/* 4. TOP ROW: Brand Icon, Title, Live Status Badges & Action Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left Block: Icon + Titles */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1878B8] via-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-sky-500/25 border border-sky-300/60 shrink-0">
              <Settings size={22} className="animate-spin-slow text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {activeBanner.title}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CSLB #1115874 Active
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold shadow-2xs">
                  Liquid Glass 3.0
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 truncate max-w-xl">
                {activeBanner.subtitle}
              </p>
            </div>
          </div>

          {/* Right Block: Global Actions (Save, Discard, Export) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={onExport}
              className="px-3 py-1.5 rounded-xl liquid-glass-btn text-slate-700 hover:text-slate-900 hover:border-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Export complete configuration JSON snapshot"
            >
              <Download size={13} className="text-[#1878B8]" />
              <span>Export</span>
            </button>

            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={onDiscard}
                className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 active:scale-98 cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] text-white hover:brightness-110'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 size={13} className="text-white" />
                  <span>Saved!</span>
                </>
              ) : isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Changes</span>
                  {hasUnsavedChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping ml-0.5" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5. BOTTOM ROW: Omnisearch Input + Tab Quick-Jumps */}
        <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          {/* Omnisearch Bar with ⌘ / Win + K */}
          <div className="w-full md:w-72 relative group/search">
            <div className="relative flex items-center rounded-xl bg-white/95 hover:bg-white focus-within:bg-white border border-slate-300/90 hover:border-sky-400 focus-within:border-[#1878B8] shadow-xs px-2.5 py-1.5 backdrop-blur-xl transition-all">
              <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#1878B8] mr-2 shrink-0">
                <Search size={12} className="stroke-[2.5]" />
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search settings, members, rules..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-500 font-semibold focus:outline-none tracking-wide"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  title="Clear search"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}

              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 font-mono shadow-2xs shrink-0 select-none ml-1">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Quick-Jump Tab Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {TAB_SHORTCUTS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onTabChange(item.tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 shrink-0 cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1878B8] to-[#0ea5e9] text-white font-bold border border-sky-400/50 shadow-sky-500/20'
                      : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/80'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-white' : 'text-[#1878B8]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isCustomizerOpen && (
        <HeroBannerCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          pageId="settings"
          activeBanner={activeBanner}
          defaultText={DEFAULT_SETTINGS_TEXT}
          onSave={saveCustomization}
          onResetPage={resetPageToDefaults}
        />
      )}
    </>
  );
}
