import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Image as ImageIcon,
  Type,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { ActiveHeroBanner, DefaultBannerText } from '@/lib/heroBannerStore';
import { uploadHeroImageFile, checkBackendConnection } from '@/api/heroBannerApi';
import { useToast } from '@/context/ToastContext';
import { CustomizerShell } from './CustomizerShell';
import { HeroBannerPreview } from './hero-banner/HeroBannerPreview';
import { HeroBannerImageTab, PresetImage } from './hero-banner/HeroBannerImageTab';
import { HeroBannerTextTab } from './hero-banner/HeroBannerTextTab';

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

const PRESET_IMAGES: PresetImage[] = [
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

  // Working state
  const [imageUrl, setImageUrl] = useState<string>(activeBanner.imageUrl);
  const [zoom, setZoom] = useState<number>(activeBanner.zoom);
  const [positionX, setPositionX] = useState<number>(activeBanner.positionX);
  const [positionY, setPositionY] = useState<number>(activeBanner.positionY);
  const [opacity, setOpacity] = useState<number>(activeBanner.opacity);
  const [overlayStrength, setOverlayStrength] = useState<number>(activeBanner.overlayStrength);
  const [applyGlobally, setApplyGlobally] = useState<boolean>(true);

  // Copy state
  const [eyebrow, setEyebrow] = useState<string>(activeBanner.eyebrow || '');
  const [title, setTitle] = useState<string>(activeBanner.title || '');
  const [subtitle, setSubtitle] = useState<string>(activeBanner.subtitle || '');

  // UI state
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Drag interaction state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: activeBanner.positionX,
    initPosY: activeBanner.positionY,
  });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever active banner opens
  useEffect(() => {
    if (isOpen) {
      setImageUrl(activeBanner.imageUrl);
      setZoom(activeBanner.zoom);
      setPositionX(activeBanner.positionX);
      setPositionY(activeBanner.positionY);
      setOpacity(activeBanner.opacity);
      setOverlayStrength(activeBanner.overlayStrength);
      setEyebrow(activeBanner.eyebrow || '');
      setTitle(activeBanner.title || '');
      setSubtitle(activeBanner.subtitle || '');
      setCustomUrlInput('');
      setUploadFileName(null);

      checkBackendConnection().then((isUp) => {
        setBackendStatus(isUp ? 'online' : 'offline');
      });
    }
  }, [isOpen, activeBanner]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: positionX,
      initPosY: positionY,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const percentDeltaX = (deltaX / rect.width) * 100;
    const percentDeltaY = (deltaY / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.initPosX - percentDeltaX)));
    const newY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.initPosY - percentDeltaY)));

    setPositionX(newX);
    setPositionY(newY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP, SVG)');
      return;
    }
    setIsUploading(true);
    try {
      const res = await uploadHeroImageFile(file);
      if (res?.url) {
        setImageUrl(res.url);
        setUploadFileName(file.name);
        toast.success('Hero image uploaded and staged.');
      } else {
        toast.error('Failed to upload photo to server.');
      }
    } catch {
      toast.error('Failed to upload photo to server.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setImageUrl(customUrlInput.trim());
    setUploadFileName('Custom Web URL');
    setCustomUrlInput('');
    toast.success('Custom image URL linked to preview.');
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
      eyebrow,
      title,
      subtitle,
    });
    onClose();
  };

  const statusBadge = backendStatus === 'online' ? (
    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-xs">
      <Cloud size={11} className="stroke-[2.5]" />
      Cloud Synced
    </span>
  ) : backendStatus === 'offline' ? (
    <span
      className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-[10px] font-medium tracking-wide flex items-center gap-1 shadow-xs"
      title="Changes are saved locally and synchronize with FastAPI backend."
    >
      <CloudOff size={11} />
      Local Cache
    </span>
  ) : null;

  const pageBadge = (
    <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[#1878B8] dark:text-[#38bdf8] text-[10px] font-black uppercase tracking-wider">
      {pageId.toUpperCase()} PAGE
    </span>
  );

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<Sliders size={18} className="stroke-[2.5]" />}
      title="Hero Banner Customizer"
      subtitle="Adjust image cropping, viewport zoom/pan, and edit copy with real-time responsive preview."
      badge={pageBadge}
      statusBadge={statusBadge}
      onReset={onResetPage}
      resetLabel="Reset All to Defaults"
      resetConfirmTitle="Reset Hero Banner"
      resetConfirmMessage="Reset hero banner settings for this page back to original defaults?"
      onSave={handleSave}
      saveLabel="Save & Apply Changes"
      onMouseUp={handleMouseUp}
    >
      <HeroBannerPreview
        previewContainerRef={previewContainerRef}
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
        imageUrl={imageUrl}
        zoom={zoom}
        positionX={positionX}
        positionY={positionY}
        opacity={opacity}
        overlayStrength={overlayStrength}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        defaultText={defaultText}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.01]">
        <button
          type="button"
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
          type="button"
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

      {/* Tab Content */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
        {activeTab === 'image' ? (
          <HeroBannerImageTab
            uploadFileName={uploadFileName}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            customUrlInput={customUrlInput}
            setCustomUrlInput={setCustomUrlInput}
            onApplyCustomUrl={handleApplyCustomUrl}
            presetImages={PRESET_IMAGES}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            setUploadFileName={setUploadFileName}
            zoom={zoom}
            setZoom={setZoom}
            positionX={positionX}
            setPositionX={setPositionX}
            positionY={positionY}
            setPositionY={setPositionY}
            opacity={opacity}
            setOpacity={setOpacity}
            overlayStrength={overlayStrength}
            setOverlayStrength={setOverlayStrength}
            applyGlobally={applyGlobally}
            setApplyGlobally={setApplyGlobally}
          />
        ) : (
          <HeroBannerTextTab
            eyebrow={eyebrow}
            setEyebrow={setEyebrow}
            title={title}
            setTitle={setTitle}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            defaultText={defaultText}
          />
        )}
      </div>
    </CustomizerShell>
  );
}

export default HeroBannerCustomizerModal;
