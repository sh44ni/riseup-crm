import React from 'react';
import { ImageUploadField, IMAGE_SPECS } from '../customizer/ImageUploadField';
import { CustomizerSection, SliderField } from '../customizer/CustomizerParts';

export interface WeatherImageTabProps {
  location: string;
  setLocation: (loc: string) => void;
  presetLocations: string[];
  tempUnit: 'F' | 'C';
  setTempUnit: (u: 'F' | 'C') => void;
  customImage: string;
  setCustomImage: (img: string) => void;
  imageOpacity: number;
  setImageOpacity: (op: number) => void;
  overlayStrength: number;
  setOverlayStrength: (st: number) => void;
  locationPlaceholder?: string;
}

export function WeatherImageTab({
  location,
  setLocation,
  presetLocations,
  tempUnit,
  setTempUnit,
  customImage,
  setCustomImage,
  imageOpacity,
  setImageOpacity,
  overlayStrength,
  setOverlayStrength,
  locationPlaceholder = 'City, state or ZIP code',
}: WeatherImageTabProps) {
  return (
    <div className="space-y-5">
      <ImageUploadField
        label="Background image"
        images={customImage ? [customImage] : []}
        onChange={(urls) => setCustomImage(urls[0] ?? '')}
        spec={IMAGE_SPECS.weather}
      />

      <CustomizerSection title="Image look">
        <SliderField label="Photo opacity" value={imageOpacity} min={40} max={100} step={5} onChange={setImageOpacity} hint={['Subtle', 'Crisp']} />
        <SliderField label="Frosted glass wash" value={overlayStrength} min={0} max={90} step={5} onChange={setOverlayStrength} hint={['None', 'Heavy']} />
      </CustomizerSection>

      <CustomizerSection title="Location & units">
        <div className="space-y-2.5">
          <input
            type="text"
            aria-label="Weather location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={locationPlaceholder}
            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 focus:border-[#1878B8] dark:focus:border-sky-400 focus:outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
          />
          <div className="flex flex-wrap gap-1.5">
            {presetLocations.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  location === loc
                    ? 'bg-sky-500/20 border-sky-400 text-[#1878B8] dark:text-sky-300'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Temperature unit">
          {(['F', 'C'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={tempUnit === u}
              onClick={() => setTempUnit(u)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                tempUnit === u
                  ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {u === 'F' ? 'Fahrenheit (°F)' : 'Celsius (°C)'}
            </button>
          ))}
        </div>
      </CustomizerSection>
    </div>
  );
}
