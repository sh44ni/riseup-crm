import React, { RefObject } from 'react';
import { MapPin, Image as ImageIcon, Upload } from 'lucide-react';

export interface PresetWallpaper {
  id: string;
  name: string;
  url: string;
  thumb: string;
}

export interface WeatherImageTabProps {
  location: string;
  setLocation: (loc: string) => void;
  presetLocations: string[];
  tempUnit: 'F' | 'C';
  setTempUnit: (u: 'F' | 'C') => void;
  customImage: string;
  setCustomImage: (img: string) => void;
  presetWallpapers: PresetWallpaper[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileUpload: (file: File) => void;
  customUrlInput: string;
  setCustomUrlInput: (url: string) => void;
  onApplyCustomUrl: () => void;
  imageOpacity: number;
  setImageOpacity: (op: number) => void;
  overlayStrength: number;
  setOverlayStrength: (st: number) => void;
}

export function WeatherImageTab({
  location,
  setLocation,
  presetLocations,
  tempUnit,
  setTempUnit,
  customImage,
  setCustomImage,
  presetWallpapers,
  fileInputRef,
  onFileUpload,
  customUrlInput,
  setCustomUrlInput,
  onApplyCustomUrl,
  imageOpacity,
  setImageOpacity,
  overlayStrength,
  setOverlayStrength,
}: WeatherImageTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. Location Settings */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={13} className="text-[#1878B8] dark:text-sky-400" />
          <span>Weather Location (Live API Target)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {presetLocations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                location === loc
                  ? 'bg-sky-500/20 border-sky-400 text-[#1878B8] dark:text-sky-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border-slate-200 dark:border-white/10 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Or enter city, state or ZIP code..."
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 focus:border-[#1878B8] dark:focus:border-sky-400 focus:outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
        />
      </div>

      {/* 2. Temperature Units Toggle */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Temperature Unit Display
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTempUnit('F')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              tempUnit === 'F'
                ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            Fahrenheit (&deg;F Primary)
          </button>
          <button
            type="button"
            onClick={() => setTempUnit('C')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              tempUnit === 'C'
                ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            Celsius (&deg;C Primary)
          </button>
        </div>
      </div>

      {/* 3. Background Imagery */}
      <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon size={13} className="text-[#1878B8] dark:text-sky-400" />
            <span>Choose Wallpaper / Upload Photo</span>
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] text-[#1878B8] dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Upload size={12} />
            <span>Upload Any Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload(file);
            }}
          />
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {presetWallpapers.map((preset) => {
            const isSelected = customImage === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCustomImage(preset.url)}
                className={`rounded-xl overflow-hidden border p-1 text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#1878B8] bg-sky-50 dark:bg-sky-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/30 bg-slate-100 dark:bg-black/40'
                }`}
              >
                <div className="aspect-[2/1] rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-900">
                  <img
                    src={preset.thumb}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate mt-1">
                  {preset.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom URL Input */}
        <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.02]">
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="Or paste image URL (https://...)"
            className="flex-1 bg-transparent px-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onApplyCustomUrl}
            disabled={!customUrlInput.trim()}
            className="px-3 py-1 rounded-lg bg-[#1878B8] hover:bg-[#14649a] dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Apply
          </button>
        </div>

        {/* Image Opacity Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Photo Clarity &amp; Opacity</span>
            <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{imageOpacity}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={100}
            step={5}
            value={imageOpacity}
            onChange={(e) => setImageOpacity(Number(e.target.value))}
            className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>Subtle (40%)</span>
            <span>Crisp &amp; Highly Visible (100%)</span>
          </div>
        </div>

        {/* Liquid Glass Overlay Wash Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Frosted Glass Wash Strength</span>
            <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{overlayStrength}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={overlayStrength}
            onChange={(e) => setOverlayStrength(Number(e.target.value))}
            className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>Clean / No Wash (0%)</span>
            <span>Heavy Frosted (90%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
