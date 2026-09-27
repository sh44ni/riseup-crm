import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  Camera,
  ChevronDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api, API_ORIGIN } from '@/lib/api';

export interface PhotoPreset {
  label: string;
  url: string;
}

interface EstimatePhotoUploaderProps {
  photoNumber: 1 | 2 | 3;
  label: string;
  subLabel: string;
  currentPhotoUrl: string;
  onPhotoChange: (url: string) => void;
  presets?: PhotoPreset[];
  compact?: boolean;
}

export function EstimatePhotoUploader({
  photoNumber,
  label,
  subLabel,
  currentPhotoUrl,
  onPhotoChange,
  presets = [],
  compact = false,
}: EstimatePhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const res = await api.uploadClientEstimatePhoto(file);
      if (res && res.url) {
        const fullUrl = res.url.startsWith('http') ? res.url : `${API_ORIGIN}${res.url}`;
        onPhotoChange(fullUrl);
      }
    } catch (err) {
      console.error('Photo upload failed, using local blob preview:', err);
      const localUrl = URL.createObjectURL(file);
      onPhotoChange(localUrl);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const badgeColor =
    photoNumber === 1
      ? 'bg-sky-600 text-white'
      : photoNumber === 2
      ? 'bg-amber-500 text-white'
      : 'bg-emerald-600 text-white';

  if (compact) {
    return (
      <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-4 h-4 rounded flex items-center justify-center font-black text-[9px] ${badgeColor}`}
            >
              {photoNumber}
            </span>
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">
              {label}
            </span>
          </div>
          <span className="text-[9px] font-semibold text-slate-400">
            {subLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Thumbnail Preview */}
          <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 relative shadow-2xs group">
            <img
              src={currentPhotoUrl}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute top-0.5 right-0.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs">
              <CheckCircle2 size={8} />
            </div>
          </div>

          {/* Quick Upload / Replace action */}
          <div className="flex-1 flex flex-col justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
              className="hidden"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
              >
                {uploading ? (
                  <>
                    <div className="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={10} />
                    <span>Upload New Photo</span>
                  </>
                )}
              </button>

              {presets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-2 py-1 rounded-lg text-[9.5px] font-bold text-sky-700 hover:bg-sky-50 border border-sky-200 flex items-center gap-0.5 cursor-pointer"
                >
                  <Sparkles size={9} />
                  <span>Presets</span>
                  <ChevronDown
                    size={9}
                    className={`transition-transform duration-150 ${showPresets ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compact Presets Dropdown */}
        {showPresets && presets.length > 0 && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 animate-in fade-in duration-150">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onPhotoChange(preset.url);
                  setShowPresets(false);
                }}
                className={`p-1 rounded-lg border text-left cursor-pointer transition-all hover:border-sky-500 bg-white ${
                  currentPhotoUrl === preset.url
                    ? 'border-sky-600 ring-1 ring-sky-500 bg-sky-50/50'
                    : 'border-slate-200'
                }`}
              >
                <div className="w-full h-8 rounded overflow-hidden mb-1">
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[8px] font-bold text-slate-700 truncate">
                  {preset.label}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full Uploader for Step 1 (Photo 1)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${badgeColor}`}
          >
            {photoNumber}
          </span>
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
            {label}
          </label>
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          {subLabel}
        </span>
      </div>

      {/* Main Image Uploader & Preview Box */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Thumbnail Preview */}
        <div className="sm:col-span-4 relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video group shadow-xs">
          <img
            src={currentPhotoUrl}
            alt={label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
            <span className="text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 text-emerald-300">
              <CheckCircle2 size={10} />
              <span>Photo {photoNumber} Active</span>
            </span>
          </div>
        </div>

        {/* Drag & Drop / Upload Area */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`sm:col-span-8 border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            dragActive
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-300 hover:border-amber-500/80 bg-white/70 hover:bg-amber-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
            className="hidden"
          />

          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={14} />
            )}
          </div>

          <div>
            <div className="text-xs font-black text-slate-800">
              {uploading
                ? `Uploading Photo ${photoNumber}...`
                : `Upload Photo ${photoNumber}`}
            </div>
            <div className="text-[10px] text-slate-500">
              Drag &amp; drop or click to browse from device / jobsite camera
            </div>
          </div>
        </div>
      </div>

      {/* Preset Fallback Toggle */}
      {presets.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-[10.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Need a fallback photo? Choose from library presets</span>
            <ChevronDown
              size={11}
              className={`transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`}
            />
          </button>

          {showPresets && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPhotoChange(preset.url)}
                  className={`rounded-lg overflow-hidden border text-left transition-all p-1 bg-white hover:shadow-xs group cursor-pointer ${
                    currentPhotoUrl === preset.url
                      ? 'border-amber-500 ring-1 ring-amber-500'
                      : 'border-slate-200 hover:border-amber-500'
                  }`}
                >
                  <div className="aspect-video w-full rounded overflow-hidden mb-1">
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="text-[9px] font-bold text-slate-700 truncate px-0.5">
                    {preset.label}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
