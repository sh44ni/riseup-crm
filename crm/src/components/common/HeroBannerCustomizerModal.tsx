import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sliders,
  Type,
  Maximize2,
  Move,
  RotateCcw,
  Check,
  Sparkles,
  Globe,
  FileImage,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { ActiveHeroBanner, DefaultBannerText } from '@/lib/heroBannerStore';
import { uploadHeroImageFile, checkBackendConnection } from '@/api/heroBannerApi';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from './ConfirmDialog';

export interface HeroBannerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  activeBanner: ActiveHeroBanner;
  defaultText: DefaultBannerText;
  onSave: (params: {
    applyGlobally: boolean;
    imageUrl: string;
    zoom: number;
    positionX: number;
    positionY: number;
    opacity: number;
    overlayStrength: number;
    eyebrow: string;
    title: string;
    subtitle: string;
  }) => void;
  onResetPage: () => void;
}

const PRESET_IMAGES = [
  {
    id: 'default-rig',
    name: 'Coastal Rig & Villa (Default)',
    url: '/hero-bg.jpg',
    thumb: '/hero-bg.jpg',
  },
  {
    id: 'oceanside-beach',
    name: 'Oceanside Pacific Beach',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'modern-roof',
    name: 'Architectural Roofing Estate',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'sunset-aerial',
    name: 'California Sunset Horizon',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'midnight-glass',
    name: 'Obsidian Midnight Minimal',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=70',
  },
];

// Design-Safe Character Limits
const LIMIT_EYEBROW = 50;
const LIMIT_TITLE = 36;
const LIMIT_SUBTITLE = 110;

export function HeroBannerCustomizerModal({
  isOpen,
  onClose,
  pageId,
  activeBanner,
  defaultText,
  onSave,
  onResetPage,
}: HeroBannerCustomizerModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // Working state
  const [imageUrl, setImageUrl] = useState<string>(activeBanner.imageUrl);
  const [zoom, setZoom] = useState<number>(activeBanner.zoom);
  const [positionX, setPositionX] = useState<number>(activeBanner.positionX);
  const [positionY, setPositionY] = useState<number>(activeBanner.positionY);
  const [opacity, setOpacity] = useState<number>(activeBanner.opacity);
  const [overlayStrength, setOverlayStrength] = useState<number>(activeBanner.overlayStrength);
  const [applyGlobally, setApplyGlobally] = useState<boolean>(true);

  // Copy editing state
  const [eyebrow, setEyebrow] = useState<string>(activeBanner.eyebrow);
  const [title, setTitle] = useState<string>(activeBanner.title);
  const [subtitle, setSubtitle] = useState<string>(activeBanner.subtitle);

  // Custom URL input
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud upload and backend connection state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Drag-to-pan in live preview
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPosX: number; startPosY: number }>({
    x: 0,
    y: 0,
    startPosX: 80,
    startPosY: 50,
  });

  // Probe backend connection status on open
  useEffect(() => {
    if (isOpen) {
      checkBackendConnection().then((isOnline) => {
        setBackendStatus(isOnline ? 'online' : 'offline');
      });
    }
  }, [isOpen]);

  // Sync state whenever modal opens or activeBanner changes
  useEffect(() => {
    if (isOpen) {
      setImageUrl(activeBanner.imageUrl);
      setZoom(activeBanner.zoom);
      setPositionX(activeBanner.positionX);
      setPositionY(activeBanner.positionY);
      setOpacity(activeBanner.opacity);
      setOverlayStrength(activeBanner.overlayStrength);
      setEyebrow(activeBanner.eyebrow);
      setTitle(activeBanner.title);
      setSubtitle(activeBanner.subtitle);
      setUploadFileName('');
      setCustomUrlInput('');
      setIsUploading(false);
    }
  }, [isOpen, activeBanner]);

  // Handle file upload: attempts cloud storage upload with graceful local Base64 fallback
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Please upload a valid image file (JPG, PNG, WEBP, SVG).');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Attempt cloud upload to FastAPI backend (S3/R2 storage)
      const uploadRes = await uploadHeroImageFile(file);
      if (uploadRes && uploadRes.url) {
        setImageUrl(uploadRes.url);
        setUploadFileName(`${file.name} (Cloud CDN)`);
        setIsUploading(false);
        return;
      }
    } catch (err) {
      console.debug('Cloud upload unavailable, falling back to local storage:', err);
    }

    // 2. Resilient fallback to local FileReader Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setImageUrl(e.target.result);
        setUploadFileName(file.name);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Drag-to-pan handlers on preview container
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: positionX,
      startPosY: positionY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startPosX - deltaX)));
    const newY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startPosY - deltaY)));
    setPositionX(newX);
    setPositionY(newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setImageUrl(customUrlInput.trim());
    setUploadFileName('Custom Web URL');
    setCustomUrlInput('');
  };

  const handleSave = () => {
    onSave({
      applyGlobally,
      imageUrl,
      zoom,
      positionX,
      positionY,
      opacity,
      overlayStrength,
      eyebrow: eyebrow.trim() || defaultText.eyebrow,
      title: title.trim() || defaultText.title,
      subtitle: subtitle.trim() || defaultText.subtitle,
    });
    onClose();
  };

  // Lock body scroll and handle Escape key for modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleResetToDefaults = () => {
    setIsConfirmResetOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      {createPortal(
        <div
          onClick={onClose}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-white/95 dark:bg-[#090E17] border border-slate-200/80 dark:border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.2)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] my-auto text-slate-800 dark:text-slate-200 select-none animate-in zoom-in-95 duration-200"
            onMouseUp={handleMouseUp}
          >
            {/* ========================================================
                MODAL HEADER
                ======================================================== */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-sky-500/20 border border-sky-300/40 shrink-0">
                  <Sliders size={18} className="stroke-[2.5]" />
                </div>
                <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Hero Banner Customizer
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[#1878B8] dark:text-[#38bdf8] text-[10px] font-black uppercase tracking-wider">
                  {pageId.toUpperCase()} PAGE
                </span>
                {backendStatus === 'online' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-xs">
                    <Cloud size={11} className="stroke-[2.5]" />
                    Cloud Synced
                  </span>
                ) : backendStatus === 'offline' ? (
                  <span
                    className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-[10px] font-medium tracking-wide flex items-center gap-1 shadow-xs"
                    title="Changes are saved to your browser cache instantly and will synchronize when the FastAPI backend connects."
                  >
                    <CloudOff size={11} />
                    Local Cache
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adjust image cropping, viewport zoom/pan, and edit copy with real-time responsive preview.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================
            INTERACTIVE LIVE VIEWPORT PREVIEW (Always Visible)
            ======================================================== */}
        {/* ========================================================
            INTERACTIVE LIVE VIEWPORT PREVIEW (Always Visible)
            ======================================================== */}
        <div className="px-6 pt-4 pb-2 bg-slate-100/60 dark:bg-[#060910] border-b border-slate-200/80 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Maximize2 size={13} className="text-[#1878B8] dark:text-sky-400" />
              <span>Live 4:1 Viewport Framing</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                (Click and drag inside preview to reposition focal point)
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#1878B8] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60">
              Pos: {positionX}% X, {positionY}% Y • Zoom: {zoom}%
            </div>
          </div>

          <div
            ref={previewRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            className={`w-full aspect-[4.2/1] max-h-[160px] rounded-2xl overflow-hidden relative border-2 ${
              isDragging ? 'border-[#1878B8] dark:border-sky-400 cursor-grabbing' : 'border-slate-300 dark:border-white/20 cursor-grab'
            } shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] select-none bg-slate-900`}
            title="Click and drag to pan image"
          >
            {/* Dynamic Background Image */}
            <div
              className="absolute inset-0 bg-no-repeat transition-transform duration-75 pointer-events-none"
              style={{
                backgroundImage: `url('${imageUrl}')`,
                backgroundSize: `${zoom}% auto`,
                backgroundPosition: `${positionX}% ${positionY}%`,
                opacity: opacity / 100,
              }}
            />

            {/* Ambient Pearl Liquid Glass Gradient Wash */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,${
                  overlayStrength / 100
                }) 0%, rgba(255,255,255,${(overlayStrength / 100) * 0.85}) 45%, rgba(255,255,255,${
                  (overlayStrength / 100) * 0.2
                }) 80%, transparent 100%)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/10 pointer-events-none" />

            {/* Sample Banner Typography Overlay */}
            <div className="absolute inset-0 p-4 lg:p-5 flex flex-col justify-end pointer-events-none z-10">
              <div className="max-w-md">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1878B8] shadow-[0_0_6px_#55C4F5]" />
                  <span className="text-[9px] tracking-[0.2em] font-extrabold uppercase text-[#1878B8] truncate drop-shadow-xs">
                    {eyebrow || defaultText.eyebrow}
                  </span>
                </div>
                <h3 className="text-lg lg:text-xl font-black tracking-tight text-[#1F1F1F] leading-tight truncate drop-shadow-xs">
                  {title || defaultText.title}
                </h3>
                <p className="text-[11px] text-slate-700 font-medium mt-0.5 truncate drop-shadow-xs">
                  {subtitle || defaultText.subtitle}
                </p>
              </div>
            </div>

            {/* Drag hint overlay badge */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white/80 text-[10px] font-semibold border border-white/10 pointer-events-none">
              <Move size={10} />
              <span>Drag to Frame</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            NAVIGATION TABS
            ======================================================== */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'border-[#1878B8] text-[#1878B8] dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ImageIcon size={14} />
            <span>Image &amp; Viewport Framing</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'border-[#1878B8] text-[#1878B8] dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Type size={14} />
            <span>Banner Copy &amp; Headings</span>
          </button>
        </div>

        {/* ========================================================
            TAB CONTENT (Scrollable Area)
            ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          {activeTab === 'image' ? (
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
                  {/* File Upload Box */}
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
                        if (file) handleFileUpload(file);
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

                  {/* Direct Web URL */}
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
                      onClick={handleApplyCustomUrl}
                      disabled={!customUrlInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-[#1878B8] hover:bg-[#14649a] dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Apply URL
                    </button>
                  </div>
                </div>

                {/* Curated Presets Carousel / Grid */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Or Select High-Res Curated Preset:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {PRESET_IMAGES.map((preset) => {
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

                  {/* 1-Click Anchor Presets */}
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
                  {/* Zoom Slider */}
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

                  {/* Pan X Slider */}
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

                  {/* Pan Y Slider */}
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
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1878B8] dark:peer-checked:bg-sky-500"></div>
                </label>
              </div>
            </div>
          ) : (
            /* ========================================================
               TAB 2: TEXT & HEADINGS WITH DESIGN-SAFE CHARACTER LIMITS
               ======================================================== */
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <Sparkles size={14} className="shrink-0" />
                <span>
                  Text limits protect the layout and prevent overlapping with search and metrics pills.
                </span>
              </div>

              {/* Eyebrow Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Eyebrow / Category Tag
                  </label>
                  <span
                    className={`text-[10.5px] font-mono font-bold ${
                      eyebrow.length >= LIMIT_EYEBROW ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {eyebrow.length} / {LIMIT_EYEBROW}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={LIMIT_EYEBROW}
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  placeholder={defaultText.eyebrow}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 focus:border-[#1878B8] dark:focus:border-sky-400 focus:outline-none text-xs text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              {/* Main Headline Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Page Hero Title
                  </label>
                  <span
                    className={`text-[10.5px] font-mono font-bold ${
                      title.length >= LIMIT_TITLE ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {title.length} / {LIMIT_TITLE}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={LIMIT_TITLE}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={defaultText.title}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 focus:border-[#1878B8] dark:focus:border-sky-400 focus:outline-none text-sm text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              {/* Subtitle Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Subtitle Description
                  </label>
                  <span
                    className={`text-[10.5px] font-mono font-bold ${
                      subtitle.length >= LIMIT_SUBTITLE ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {subtitle.length} / {LIMIT_SUBTITLE}
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={LIMIT_SUBTITLE}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={defaultText.subtitle}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 focus:border-[#1878B8] dark:focus:border-sky-400 focus:outline-none text-xs text-slate-900 dark:text-slate-200 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                />
              </div>

              {/* Revert Copy Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEyebrow(defaultText.eyebrow);
                    setTitle(defaultText.title);
                    setSubtitle(defaultText.subtitle);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset Copy to Default</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            MODAL FOOTER ACTIONS
            ======================================================== */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset All to Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] text-white text-xs font-bold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-sky-300/40"
            >
              <Check size={14} className="stroke-[3]" />
              <span>Save &amp; Apply Changes</span>
            </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Reset Confirmation Dialog */}
    <ConfirmDialog
      isOpen={isConfirmResetOpen}
      title="Reset Hero Banner"
      message="Reset hero banner settings for this page back to original defaults?"
      confirmLabel="Reset to Defaults"
      variant="warning"
      onConfirm={() => {
        onResetPage();
        setIsConfirmResetOpen(false);
        onClose();
      }}
      onCancel={() => setIsConfirmResetOpen(false)}
    />
    </>
  );
}

export default HeroBannerCustomizerModal;
