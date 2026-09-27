import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  Camera,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { api, API_ORIGIN } from '@/lib/api';

interface EstimateClientPhotoUploadProps {
  currentPhotoUrl: string;
  onPhotoChange: (url: string) => void;
  clientName?: string;
}

const PRESET_FALLBACK_PHOTOS = [
  {
    label: 'Spanish Tile Villa (Oceanside)',
    url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Coastal Mediterranean Residence',
    url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Modern Clay Tile Estate',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Luxury Estate (Rancho Santa Fe)',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
];

export function EstimateClientPhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  clientName = 'Client',
}: EstimateClientPhotoUploadProps) {
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
      console.error('Photo upload failed:', err);
      // Fallback: create local object URL so user can still preview immediately
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-amber-500" />
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Client&apos;s Property &amp; Roof Photo
          </label>
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          Cover Page &amp; Overview Hero
        </span>
      </div>

      {/* Main Image Uploader & Preview Box */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Thumbnail Preview */}
        <div className="sm:col-span-4 relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video group shadow-xs">
          <img
            src={currentPhotoUrl}
            alt={`${clientName} Residence`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
            <span className="text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 text-emerald-300">
              <CheckCircle2 size={10} />
              <span>Client&apos;s House Photo</span>
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
              {uploading ? 'Uploading Client Photo...' : 'Click to Upload Client Photo'}
            </div>
            <div className="text-[10px] text-slate-500">
              Drag &amp; drop or click to browse from device / jobsite camera
            </div>
          </div>
        </div>
      </div>

      {/* Preset Fallback Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-[10.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
        >
          <span>Need a fallback photo? Choose architectural preset</span>
          <ChevronDown size={11} className={`transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`} />
        </button>

        {showPresets && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
            {PRESET_FALLBACK_PHOTOS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onPhotoChange(preset.url)}
                className="rounded-lg overflow-hidden border border-slate-200 hover:border-amber-500 text-left transition-all p-1 bg-white hover:shadow-xs group cursor-pointer"
              >
                <div className="aspect-video w-full rounded overflow-hidden mb-1">
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="text-[9px] font-bold text-slate-700 truncate px-0.5">{preset.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
