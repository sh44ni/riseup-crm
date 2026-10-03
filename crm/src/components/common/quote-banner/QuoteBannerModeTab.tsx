import React, { RefObject } from 'react';
import { ImageIcon, Layers, Upload, Check } from 'lucide-react';
import { QuoteSlide } from '@/lib/quoteBannerStore';

export interface PresetQuoteImage {
  title: string;
  subtitle: string;
  url: string;
}

export interface QuoteBannerModeTabProps {
  mode: 'single' | 'slideshow';
  setMode: (m: 'single' | 'slideshow') => void;
  singleImageUrl: string;
  slides: QuoteSlide[];
  customUrlInput: string;
  setCustomUrlInput: (val: string) => void;
  onAddUrl: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  presetImages: PresetQuoteImage[];
  onSelectPreset: (url: string, title: string) => void;
}

export function QuoteBannerModeTab({
  mode,
  setMode,
  singleImageUrl,
  slides,
  customUrlInput,
  setCustomUrlInput,
  onAddUrl,
  fileInputRef,
  onFileUpload,
  isUploading,
  presetImages,
  onSelectPreset,
}: QuoteBannerModeTabProps) {
  return (
    <div className="space-y-6">
      {/* Display Mode Selection */}
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
          Presentation Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
              mode === 'single'
                ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400/80 text-slate-900 dark:text-white shadow-xs'
                : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-sky-400/20 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
              <ImageIcon size={16} />
            </div>
            <div>
              <div className="text-xs font-bold">Single Image</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Fixed quote graphic banner</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('slideshow')}
            className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
              mode === 'slideshow'
                ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400/80 text-slate-900 dark:text-white shadow-xs'
                : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-sky-400/20 text-[#0284c7] dark:text-sky-300 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <div className="text-xs font-bold">Slideshow Carousel</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Rotating multi-image banner</div>
            </div>
          </button>
        </div>
      </div>

      {/* Upload or Custom URL Input */}
      <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>{mode === 'single' ? 'Upload Custom Image' : 'Add New Slide Image'}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">PNG, JPG, WebP</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste image URL (https://...)"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddUrl()}
            className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284c7] dark:focus:border-sky-400"
          />
          <button
            type="button"
            onClick={onAddUrl}
            disabled={!customUrlInput.trim()}
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            {mode === 'single' ? 'Apply URL' : 'Add to Slides'}
          </button>
        </div>

        <div className="flex items-center justify-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload size={14} className="text-sky-500 dark:text-sky-400" />
            <span>{isUploading ? 'Processing File...' : 'Upload Image File from Computer'}</span>
          </button>
        </div>
      </div>

      {/* Curated Preset Library */}
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
          Curated Presets Library
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {presetImages.map((preset, idx) => {
            const isSelected =
              mode === 'single'
                ? singleImageUrl === preset.url
                : slides.some((s) => s.imageUrl === preset.url);

            return (
              <div
                key={idx}
                onClick={() => onSelectPreset(preset.url, preset.title)}
                className={`relative rounded-xl overflow-hidden border p-2 flex flex-col justify-end min-h-[90px] cursor-pointer group transition-all ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-400/30'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url('${preset.url}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10">
                  <div className="text-[11px] font-bold text-white leading-tight truncate">
                    {preset.title}
                  </div>
                  <div className="text-[9px] text-slate-300 truncate">
                    {preset.subtitle}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                    <Check size={10} className="stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
