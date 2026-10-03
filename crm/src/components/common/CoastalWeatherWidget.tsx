import React, { useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';
import { useWeatherWidget, FALLBACK_WEATHER_LOCATION } from '@/lib/weatherStore';
import { useTheme } from '@/context/ThemeContext';
import { WeatherCustomizerModal } from './WeatherCustomizerModal';
import { VolumetricWeatherIcon } from './VolumetricWeatherIcon';

export interface CoastalWeatherWidgetProps {
  className?: string;
}

export function CoastalWeatherWidget({ className = '' }: CoastalWeatherWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    config,
    weatherData,
    effectiveCondition,
    updateConfig,
    resetConfig,
    isSaving,
  } = useWeatherWidget();

  // Unit-aware metrics
  const isFahrenheit = config.tempUnit === 'F';
  const displayTemp = isFahrenheit ? weatherData.temp_f : weatherData.temp_c;
  const secondaryTemp = isFahrenheit ? `${weatherData.temp_c}°C` : `${weatherData.temp_f}°F`;
  const displayHigh = isFahrenheit ? weatherData.high_f : weatherData.high_c;
  const displayLow = isFahrenheit ? weatherData.low_f : weatherData.low_c;
  const displayFeels = isFahrenheit ? weatherData.feelslike_f : weatherData.feelslike_c;

  // Human-readable condition label
  const conditionLabel = weatherData.condition_text || 'Sunny';

  return (
    <>
      <div
        className={`relative z-10 rounded-2xl overflow-hidden border border-white/85 dark:border-white/10 shadow-xs p-4 group/weather min-h-[162px] flex flex-col justify-between light-glass-panel glossy-sheen hover:border-sky-300 dark:hover:border-sky-500/30 transition-all select-none ${className}`}
      >
        {/* ========================================================
            1. CRISP COASTAL BACKDROP (High Visibility & Rich Saturation)
            ======================================================== */}
        <div
          className="absolute inset-0 bg-cover bg-[position:65%_center] transition-transform duration-700 ease-out group-hover/weather:scale-105 pointer-events-none"
          style={{
            backgroundImage: config.customImage ? `url('${config.customImage}')` : 'none',
            opacity: config.imageOpacity / 100,
            filter: 'brightness(1.05) saturate(1.18)',
          }}
        />

        {/* Ambient Liquid Glass Wash — Balanced to keep image visible & text crisp in both light and dark */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? `linear-gradient(to right, rgba(7,12,21,${
                  config.overlayStrength / 100
                }) 0%, rgba(7,12,21,${(config.overlayStrength / 100) * 0.75}) 45%, rgba(7,12,21,${
                  (config.overlayStrength / 100) * 0.25
                }) 75%, rgba(7,12,21,0.05) 100%)`
              : `linear-gradient(to right, rgba(255,255,255,${
                  config.overlayStrength / 100
                }) 0%, rgba(255,255,255,${(config.overlayStrength / 100) * 0.75}) 45%, rgba(255,255,255,${
                  (config.overlayStrength / 100) * 0.2
                }) 75%, rgba(255,255,255,0.05) 100%)`,
          }}
        />
        <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-gradient-to-b from-black/40 via-transparent to-black/30' : 'bg-gradient-to-b from-white/30 via-transparent to-black/10'}`} />

        {/* ========================================================
            2. TOP TIER: Location Badge + Customize Pencil (Left) & Flush Top-Right Icon
            ======================================================== */}
        <div className="relative z-10 flex items-start justify-between">
          {/* Left Cluster: Location Badge + Customize Pencil to its right */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/92 dark:bg-slate-900/85 backdrop-blur-md border border-sky-200/80 dark:border-sky-800/50 shadow-2xs">
              <MapPin size={11} style={{ color: config.textColors?.locationColor || (isDark ? '#38bdf8' : '#0284c7') }} />
              <span
                className="text-[10.5px] font-bold tracking-wide"
                style={{ color: config.textColors?.locationColor || (isDark ? '#7dd3fc' : '#0369a1') }}
              >
                {config.location}
              </span>
            </div>

            {/* Customize Pencil Button (Placed directly to the right of Oceanside, CA) */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              aria-label="Customize Weather Widget"
              title="Customize Widget Wallpaper & Colors"
              className="w-6 h-6 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-sky-500 text-slate-500 dark:text-slate-300 hover:text-white flex items-center justify-center border border-white/80 dark:border-white/10 shadow-xs opacity-0 group-hover/weather:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 shrink-0"
            >
              <Pencil size={11} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Top-Right: Flush Volumetric 3D Icon + Small Condition Text */}
          <div
            className="flex flex-col items-center group-hover/weather:scale-105 transition-transform duration-300 cursor-pointer -mt-1 -mr-1"
            onClick={() => setIsModalOpen(true)}
            title="Click to customize weather & wallpaper"
          >
            <VolumetricWeatherIcon condition={effectiveCondition} size={48} />
            <span
              className="text-[9px] font-extrabold tracking-wider uppercase drop-shadow-xs -mt-1.5 px-2 py-0.5 rounded-full border shadow-2xs transition-colors"
              style={{
                color: config.textColors?.conditionBadgeColor || (isDark ? '#F1F5F9' : '#1E293B'),
                backgroundColor: config.textColors?.conditionBadgeBg || (isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)'),
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {conditionLabel}
            </span>
          </div>
        </div>

        {/* ========================================================
            3. MAIN TIER: Hero Temperature (With individual text colors)
            ======================================================== */}
        <div className="relative z-10 flex items-end justify-between mt-auto pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-5xl font-black tracking-tight leading-none drop-shadow-xs"
                style={{ color: config.textColors?.tempColor || (isDark ? '#FFFFFF' : '#1F1F1F') }}
              >
                {displayTemp}°
              </span>
              <span
                className="text-sm font-black drop-shadow-xs"
                style={{ color: config.textColors?.secondaryTempColor || (isDark ? '#94A3B8' : '#64748B') }}
              >
                / {secondaryTemp}
              </span>
            </div>
            <div
              className="text-[11px] font-bold mt-2 flex items-center gap-1.5 drop-shadow-xs"
              style={{ color: config.textColors?.metricsColor || (isDark ? '#CBD5E1' : '#334155') }}
            >
              <span>
                H: {displayHigh}° &nbsp;•&nbsp; L: {displayLow}°
              </span>
              <span className="opacity-60">•</span>
              <span className="font-medium">Feels {displayFeels}°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Customizer Modal */}
      {isModalOpen && (
        <WeatherCustomizerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentConfig={config}
          weatherData={weatherData}
          onSave={updateConfig}
          onReset={resetConfig}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
