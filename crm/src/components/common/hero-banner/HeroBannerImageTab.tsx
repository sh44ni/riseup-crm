import React, { RefObject } from 'react';
import { FileImage, Check, Upload, Loader2, Move, Globe } from 'lucide-react';

export interface PresetImage {
  id: string;
  name: string;
  url: string;
  thumb: string;
}

export interface HeroBannerImageTabProps {
  uploadFileName: string | null;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileUpload: (file: File) => void;
  customUrlInput: string;
  setCustomUrlInput: (url: string) => void;
  onApplyCustomUrl: () => void;
  presetImages: PresetImage[];
  imageUrl: string;
  setImageUrl: (url: string) => void;
  setUploadFileName: (name: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
  positionX: number;
  setPositionX: (x: number) => void;
  positionY: number;
  setPositionY: (y: number) => void;
  opacity: number;
  setOpacity: (o: number) => void;
  overlayStrength: number;
  setOverlayStrength: (s: number) => void;
  applyGlobally: boolean;
  setApplyGlobally: (g: boolean) => void;
}

export function HeroBannerImageTab({
  uploadFileName,
  isUploading,
  fileInputRef,
  onFileUpload,
  customUrlInput,
  setCustomUrlInput,
  onApplyCustomUrl,
  presetImages,
  imageUrl,
  setImageUrl,
  setUploadFileName,
  zoom,
  setZoom,
  positionX,
  setPositionX,
  positionY,
  setPositionY,
  opacity,
  setOpacity,
  overlayStrength,
  setOverlayStrength,
  applyGlobally,
  setApplyGlobally,
}: HeroBannerImageTabProps) {
  return (
    <div className="space-y-6">
      {/* Image Source Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FileImage size={13} className="text-[#1878B8] dark:text-sky-400" />
            <span>Choose Imagery / Upload</span>
          </label>
          {uploadFileName && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check size={12} /> Active: {uploadFileName}
            </span>
          )}
        </div>

        {/* Upload Button + URL Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
            className={`p-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center gap-3.5 select-none ${
              isUploading
                ? 'border-sky-500/50 bg-sky-500/10 cursor-wait opacity-80'
                : 'border-slate-300 hover:border-[#1878B8] dark:border-white/20 dark:hover:border-sky-400/60 bg-slate-50/70 hover:bg-sky-50/50 dark:bg-white/[0.02] dark:hover:bg-sky-500/[0.05] cursor-pointer group/upload'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
            />
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-[#1878B8] dark:text-sky-400 group-hover/upload:scale-110 transition-transform shrink-0">
              {isUploading ? (
                <Loader2 size={18} className="animate-spin text-[#1878B8] dark:text-sky-400" />
              ) : (
                <Upload size={18} />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover/upload:text-[#1878B8] dark:group-hover/upload:text-sky-300">
                {isUploading ? 'Uploading to Cloud...' : 'Upload Any Photo'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isUploading
                  ? 'Optimizing and syncing across pages'
                  : 'PNG, JPG, WEBP, SVG • Cloud CDN ready'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.02]">
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Paste image URL (https://...)"
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-medium"
            />
            <button
              type="button"
              onClick={onApplyCustomUrl}
              disabled={!customUrlInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-[#1878B8] hover:bg-[#14649a] dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Apply URL
            </button>
          </div>
        </div>

        {/* Curated Presets Grid */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Or Select High-Res Curated Preset:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {presetImages.map((preset) => {
              const isSelected = imageUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setImageUrl(preset.url);
                    setUploadFileName(preset.name);
                  }}
                  className={`group relative rounded-xl overflow-hidden border transition-all text-left cursor-pointer p-1 ${
                    isSelected
                      ? 'border-[#1878B8] bg-sky-50 dark:bg-sky-500/20 shadow-[0_0_15px_rgba(24,120,184,0.25)] dark:shadow-[0_0_15px_rgba(56,189,248,0.35)]'
                      : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/30 bg-slate-100 dark:bg-black/40'
                  }`}
                >
                  <div className="aspect-[2/1] rounded-lg overflow-hidden relative bg-slate-200 dark:bg-slate-900">
                    <img
                      src={preset.thumb}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1878B8] dark:bg-sky-400 text-white dark:text-slate-950 flex items-center justify-center">
                        <Check size={10} className="stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 px-1">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                      {preset.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Viewport Cropping & Position Controls */}
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Move size={13} className="text-[#1878B8] dark:text-sky-400" />
            <span>Viewport Cropping, Scale &amp; Focal Point</span>
          </span>

          {/* Anchor Presets */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mr-1">Anchors:</span>
            <button
              type="button"
              onClick={() => {
                setPositionX(80);
                setPositionY(50);
              }}
              className="px-2 py-0.5 rounded-md bg-sky-500/20 text-[#1878B8] dark:text-sky-300 hover:bg-sky-500/30 text-[10px] font-bold border border-sky-400/30 cursor-pointer"
            >
              Default (Rig)
            </button>
            <button
              type="button"
              onClick={() => {
                setPositionX(50);
                setPositionY(50);
              }}
              className="px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300/80 dark:border-white/10 cursor-pointer"
            >
              Center
            </button>
            <button
              type="button"
              onClick={() => {
                setPositionX(0);
                setPositionY(50);
              }}
              className="px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300/80 dark:border-white/10 cursor-pointer"
            >
              Left
            </button>
            <button
              type="button"
              onClick={() => {
                setPositionX(100);
                setPositionY(50);
              }}
              className="px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300/80 dark:border-white/10 cursor-pointer"
            >
              Right
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Zoom / Scale</span>
              <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{zoom}%</span>
            </div>
            <input
              type="range"
              min={100}
              max={250}
              step={5}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>100% (Fit)</span>
              <span>250% (Tight)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Horizontal Pan (X)</span>
              <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{positionX}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={positionX}
              onChange={(e) => setPositionX(Number(e.target.value))}
              className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>Left</span>
              <span>Right</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Vertical Pan (Y)</span>
              <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{positionY}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={positionY}
              onChange={(e) => setPositionY(Number(e.target.value))}
              className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>Top</span>
              <span>Bottom</span>
            </div>
          </div>
        </div>

        {/* Opacity & Glass Overlay Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 dark:border-white/5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Photo Opacity</span>
              <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{opacity}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Glass Contrast Overlay</span>
              <span className="font-mono text-[#1878B8] dark:text-sky-400 font-bold">{overlayStrength}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              step={5}
              value={overlayStrength}
              onChange={(e) => setOverlayStrength(Number(e.target.value))}
              className="w-full accent-[#1878B8] dark:accent-sky-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Global Scope Sync Switch */}
      <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/30 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-sky-400/30 shrink-0 mt-0.5">
            <Globe size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Apply Image &amp; Viewport Framing Globally</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-400/20 text-[#1878B8] dark:text-sky-300 text-[9px] font-black uppercase">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Synchronizes this imagery, zoom, and framing across <strong>all CRM pages</strong> (Leads, Clients, Pipeline, Estimates, Calendar, Tasks, etc.).
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={applyGlobally}
            onChange={(e) => setApplyGlobally(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1878B8] dark:peer-checked:bg-sky-500" />
        </label>
      </div>
    </div>
  );
}
