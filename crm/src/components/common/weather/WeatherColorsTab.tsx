import React from 'react';
import { Sparkles, Palette } from 'lucide-react';
import { WeatherTextColors } from '@/lib/weatherStore';

export interface ColorPreset {
  name: string;
  colors: WeatherTextColors;
  bgHint: string;
}

export interface WeatherColorsTabProps {
  textColors: WeatherTextColors;
  updateColorKey: (key: keyof WeatherTextColors, value: string) => void;
  setTextColors: (colors: WeatherTextColors) => void;
  colorPresets: ColorPreset[];
  swatchPalette: string[];
  conditionLabel: string;
}

export function WeatherColorsTab({
  textColors,
  updateColorKey,
  setTextColors,
  colorPresets,
  swatchPalette,
  conditionLabel,
}: WeatherColorsTabProps) {
  return (
    <div className="space-y-6">
      {/* 1-Click Color Themes */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={13} className="text-amber-500 dark:text-amber-400" />
          <span>1-Click Curated Color Themes</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {colorPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => setTextColors(preset.colors)}
              className="p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#1878B8] dark:hover:border-white/30 bg-slate-50/70 hover:bg-sky-50/50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] transition-all flex items-center justify-between cursor-pointer group text-left"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1878B8] dark:group-hover:text-white">
                  {preset.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Pre-balanced contrast for readability
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/30 shadow-xs"
                  style={{ backgroundColor: preset.colors.tempColor }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/30 shadow-xs"
                  style={{ backgroundColor: preset.colors.locationColor }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/30 shadow-xs"
                  style={{ backgroundColor: preset.colors.conditionBadgeColor }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Granular Individual Text Color Controls */}
      <div className="space-y-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Palette size={13} className="text-[#1878B8] dark:text-sky-400" />
          <span>Granular Individual Text Colors</span>
        </div>

        {/* Color Row 1: Main Temp Number */}
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              1. Main Temperature Number (72&deg;)
            </span>
            <input
              type="color"
              value={textColors.tempColor || '#1F1F1F'}
              onChange={(e) => updateColorKey('tempColor', e.target.value)}
              className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {swatchPalette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateColorKey('tempColor', color)}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                  textColors.tempColor === color
                    ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-slate-300 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Color Row 2: Secondary Temp (/ 22°C) */}
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              2. Secondary Temperature (/ 22&deg;C)
            </span>
            <input
              type="color"
              value={textColors.secondaryTempColor || '#64748B'}
              onChange={(e) => updateColorKey('secondaryTempColor', e.target.value)}
              className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {swatchPalette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateColorKey('secondaryTempColor', color)}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                  textColors.secondaryTempColor === color
                    ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-slate-300 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Color Row 3: Metrics (High / Low / Feels Like) */}
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              3. Metrics Line (H: 76&deg; &bull; L: 62&deg; &bull; Feels 74&deg;)
            </span>
            <input
              type="color"
              value={textColors.metricsColor || '#334155'}
              onChange={(e) => updateColorKey('metricsColor', e.target.value)}
              className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {swatchPalette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateColorKey('metricsColor', color)}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                  textColors.metricsColor === color
                    ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-slate-300 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Color Row 4: Location Name */}
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              4. Location Badge Text
            </span>
            <input
              type="color"
              value={textColors.locationColor || '#0369A1'}
              onChange={(e) => updateColorKey('locationColor', e.target.value)}
              className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {swatchPalette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateColorKey('locationColor', color)}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                  textColors.locationColor === color
                    ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-slate-300 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Color Row 5: Condition Badge Text */}
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              5. Condition Badge Text ({conditionLabel})
            </span>
            <input
              type="color"
              value={textColors.conditionBadgeColor || '#1E293B'}
              onChange={(e) => updateColorKey('conditionBadgeColor', e.target.value)}
              className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {swatchPalette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateColorKey('conditionBadgeColor', color)}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                  textColors.conditionBadgeColor === color
                    ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-slate-300 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
