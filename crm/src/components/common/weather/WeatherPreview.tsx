import React from 'react';
import { Sparkles, MapPin, Pencil } from 'lucide-react';
import { WeatherTextColors } from '@/lib/weatherStore';
import { WeatherData } from '@/api/weatherApi';
import { VolumetricWeatherIcon } from '../VolumetricWeatherIcon';

export interface WeatherPreviewProps {
  weatherData: WeatherData;
  customImage: string;
  imageOpacity: number;
  overlayStrength: number;
  location: string;
  textColors: WeatherTextColors;
  tempUnit: 'F' | 'C';
}

export function WeatherPreview({
  weatherData,
  customImage,
  imageOpacity,
  overlayStrength,
  location,
  textColors,
  tempUnit,
}: WeatherPreviewProps) {
  const displayTemp = tempUnit === 'F' ? weatherData.temp_f : weatherData.temp_c;
  const secondaryTemp = tempUnit === 'F' ? `${weatherData.temp_c}°C` : `${weatherData.temp_f}°F`;
  const displayHigh = tempUnit === 'F' ? weatherData.high_f : weatherData.high_c;
  const displayLow = tempUnit === 'F' ? weatherData.low_f : weatherData.low_c;
  const displayFeels = tempUnit === 'F' ? weatherData.feelslike_f : weatherData.feelslike_c;
  const conditionLabel = weatherData.condition_text || 'Sunny';

  return (
    <div className="p-6 bg-slate-100/60 dark:bg-[#060910] border-b border-slate-200/80 dark:border-white/10">
      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500 dark:text-amber-400" />
          <span>Preview</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          {weatherData.location} &bull; {weatherData.temp_f}&deg;F
        </span>
      </div>

      {/* Rendered Widget Card Preview */}
      <div className="relative rounded-2xl overflow-hidden border border-white/85 dark:border-white/10 shadow-sm p-4 min-h-[162px] flex flex-col justify-between max-w-sm mx-auto bg-slate-900 select-none">
        {/* Dynamic Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-[position:65%_center] transition-transform duration-700 pointer-events-none"
          style={{
            backgroundImage: customImage ? `url('${customImage}')` : 'none',
            opacity: imageOpacity / 100,
            filter: 'brightness(1.05) saturate(1.18)',
          }}
        />

        {/* Ambient Frosted Liquid Wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,${
              overlayStrength / 100
            }) 0%, rgba(255,255,255,${(overlayStrength / 100) * 0.75}) 45%, rgba(255,255,255,${
              (overlayStrength / 100) * 0.2
            }) 75%, rgba(255,255,255,0.05) 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/10 pointer-events-none" />

        {/* Top Row: Location Badge & Flush Volumetric 3D Icon */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-md border border-sky-200/80 shadow-2xs">
              <MapPin size={11} style={{ color: textColors.locationColor || '#0284c7' }} />
              <span
                className="text-[10.5px] font-bold tracking-wide"
                style={{ color: textColors.locationColor || '#0369a1' }}
              >
                {location}
              </span>
            </div>
            <div className="w-5 h-5 rounded-full bg-white/90 text-slate-500 flex items-center justify-center border border-white/80 shadow-2xs">
              <Pencil size={9} className="stroke-[2.5]" />
            </div>
          </div>

          <div className="flex flex-col items-center -mt-1 -mr-1">
            <VolumetricWeatherIcon condition={weatherData.condition_key} size={46} />
            <span
              className="text-[9px] font-extrabold tracking-wider uppercase drop-shadow-xs -mt-1.5 px-2 py-0.5 rounded-full border shadow-2xs transition-colors"
              style={{
                color: textColors.conditionBadgeColor || '#1E293B',
                backgroundColor: textColors.conditionBadgeBg || 'rgba(255, 255, 255, 0.88)',
                borderColor: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {conditionLabel}
            </span>
          </div>
        </div>

        {/* Bottom Row: Temperature */}
        <div className="relative z-10 flex items-end justify-between mt-auto pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-5xl font-black tracking-tight leading-none drop-shadow-xs"
                style={{ color: textColors.tempColor || '#1F1F1F' }}
              >
                {displayTemp}&deg;
              </span>
              <span
                className="text-sm font-black drop-shadow-xs"
                style={{ color: textColors.secondaryTempColor || '#64748B' }}
              >
                / {secondaryTemp}
              </span>
            </div>
            <div
              className="text-[11px] font-bold mt-2 flex items-center gap-1.5 drop-shadow-xs"
              style={{ color: textColors.metricsColor || '#334155' }}
            >
              <span>
                H: {displayHigh}&deg; &nbsp;&bull;&nbsp; L: {displayLow}&deg;
              </span>
              <span className="opacity-60">&bull;</span>
              <span className="font-medium">Feels {displayFeels}&deg;</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
