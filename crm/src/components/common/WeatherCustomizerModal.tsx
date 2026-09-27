import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Upload,
  MapPin,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Type,
  Pencil,
} from 'lucide-react';
import { WeatherWidgetConfig, WeatherTextColors, DEFAULT_TEXT_COLORS } from '@/lib/weatherStore';
import { WeatherData } from '@/api/weatherApi';
import { VolumetricWeatherIcon } from './VolumetricWeatherIcon';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from './ConfirmDialog';

export interface WeatherCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: WeatherWidgetConfig;
  weatherData: WeatherData;
  onSave: (config: WeatherWidgetConfig) => void;
  onReset: () => void;
}

const PRESET_LOCATIONS = [
  'Oceanside, CA',
  'Carlsbad, CA',
  'San Diego, CA',
  'Vista, CA',
  'Encinitas, CA',
  'Poway, CA',
];

const PRESET_WALLPAPERS = [
  {
    id: 'default-rig',
    name: 'Coastal Rig & Villa (Default)',
    url: '/hero-bg.jpg',
    thumb: '/hero-bg.jpg',
  },
  {
    id: 'oceanside-beach',
    name: 'Oceanside Pacific Beach',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'modern-estate',
    name: 'Architectural Roofing Estate',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'sunset-coast',
    name: 'California Sunset Horizon',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'midnight-minimal',
    name: 'Obsidian Midnight Minimal',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=70',
  },
];

// Curated 1-Click Color Themes
const COLOR_PRESETS: { name: string; colors: WeatherTextColors; bgHint: string }[] = [
  {
    name: 'Obsidian Dark (Light Backgrounds)',
    bgHint: 'bg-slate-900',
    colors: {
      tempColor: '#1F1F1F',
      secondaryTempColor: '#64748B',
      metricsColor: '#334155',
      locationColor: '#0369A1',
      conditionBadgeColor: '#1E293B',
      conditionBadgeBg: 'rgba(255, 255, 255, 0.88)',
    },
  },
  {
    name: 'Snow White (Dark / Night Photos)',
    bgHint: 'bg-white',
    colors: {
      tempColor: '#FFFFFF',
      secondaryTempColor: '#CBD5E1',
      metricsColor: '#F1F5F9',
      locationColor: '#38BDF8',
      conditionBadgeColor: '#FFFFFF',
      conditionBadgeBg: 'rgba(15, 23, 42, 0.75)',
    },
  },
  {
    name: 'Sunset Golden Amber',
    bgHint: 'bg-amber-400',
    colors: {
      tempColor: '#F59E0B',
      secondaryTempColor: '#FBBF24',
      metricsColor: '#FDE68A',
      locationColor: '#D97706',
      conditionBadgeColor: '#78350F',
      conditionBadgeBg: 'rgba(254, 243, 199, 0.9)',
    },
  },
  {
    name: 'Pacific Ocean Cyan',
    bgHint: 'bg-sky-400',
    colors: {
      tempColor: '#0284C7',
      secondaryTempColor: '#38BDF8',
      metricsColor: '#0369A1',
      locationColor: '#0284C7',
      conditionBadgeColor: '#0C4A6E',
      conditionBadgeBg: 'rgba(224, 242, 254, 0.92)',
    },
  },
];

const SWATCH_PALETTE = [
  '#1F1F1F',
  '#FFFFFF',
  '#0284C7',
  '#0369A1',
  '#38BDF8',
  '#F59E0B',
  '#D97706',
  '#10B981',
  '#6366F1',
  '#E11D48',
  '#64748B',
  '#94A3B8',
];

export function WeatherCustomizerModal({
  isOpen,
  onClose,
  currentConfig,
  weatherData,
  onSave,
  onReset,
}: WeatherCustomizerModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'image' | 'colors'>('image');
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // Image & Framing state
  const [location, setLocation] = useState(currentConfig.location);
  const [customImage, setCustomImage] = useState(currentConfig.customImage);
  const [imageOpacity, setImageOpacity] = useState(currentConfig.imageOpacity);
  const [overlayStrength, setOverlayStrength] = useState(currentConfig.overlayStrength);
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(currentConfig.tempUnit);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Individual Text Colors state
  const [textColors, setTextColors] = useState<WeatherTextColors>({
    ...DEFAULT_TEXT_COLORS,
    ...(currentConfig.textColors || {}),
  });

  useEffect(() => {
    if (isOpen) {
      setLocation(currentConfig.location);
      setCustomImage(currentConfig.customImage);
      setImageOpacity(currentConfig.imageOpacity);
      setOverlayStrength(currentConfig.overlayStrength);
      setTempUnit(currentConfig.tempUnit);
      setTextColors({
        ...DEFAULT_TEXT_COLORS,
        ...(currentConfig.textColors || {}),
      });
      setCustomUrlInput('');
    }
  }, [isOpen, currentConfig]);

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

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Please upload a valid image file (JPG, PNG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setCustomImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setCustomImage(customUrlInput.trim());
    setCustomUrlInput('');
  };

  const updateColorKey = (key: keyof WeatherTextColors, value: string) => {
    setTextColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    onSave({
      location: location.trim() || 'Oceanside, CA',
      customImage,
      imageOpacity,
      overlayStrength,
      tempUnit,
      textColors,
    });
    onClose();
  };

  const handleReset = () => {
    setIsConfirmResetOpen(true);
  };

  // Unit-aware metrics for live preview
  const displayTemp = tempUnit === 'F' ? weatherData.temp_f : weatherData.temp_c;
  const secondaryTemp = tempUnit === 'F' ? `${weatherData.temp_c}°C` : `${weatherData.temp_f}°F`;
  const displayHigh = tempUnit === 'F' ? weatherData.high_f : weatherData.high_c;
  const displayLow = tempUnit === 'F' ? weatherData.low_f : weatherData.low_c;
  const displayFeels = tempUnit === 'F' ? weatherData.feelslike_f : weatherData.feelslike_c;
  const conditionLabel = weatherData.condition_text || 'Sunny';

  return (
    <>
      {createPortal(
        <div
          onClick={onClose}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white/95 dark:bg-[#090E17] border border-slate-200/80 dark:border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.2)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] my-auto text-slate-800 dark:text-slate-200 select-none animate-in zoom-in-95 duration-200"
          >
            {/* ========================================================
                MODAL HEADER
                ======================================================== */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-sky-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 border border-amber-300/40 shrink-0">
                  <Sliders size={18} className="stroke-[2.5]" />
                </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Weather Widget Customizer
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[#1878B8] dark:text-sky-300 text-[10px] font-black uppercase tracking-wider">
                  IMAGE &amp; TEXT COLORS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize background wallpaper, clarity, and individual text colors. Weather data is live from the API.
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
            LIVE INTERACTIVE PREVIEW CARD
            ======================================================== */}
        <div className="p-6 bg-slate-100/60 dark:bg-[#060910] border-b border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500 dark:text-amber-400" />
              <span>Live Responsive Preview</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Live API: {weatherData.location} • {weatherData.temp_f}°F
            </span>
          </div>

          {/* Rendered Widget Card Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-white/85 dark:border-white/10 shadow-sm p-4 min-h-[162px] flex flex-col justify-between max-w-sm mx-auto bg-slate-900 select-none">
            {/* Dynamic Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-[position:65%_center] transition-transform duration-700 pointer-events-none"
              style={{
                backgroundImage: `url('${customImage}')`,
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

            {/* Top Row: Location Badge + Pencil (Left) & Flush Volumetric 3D Icon (Right) */}
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

              {/* Flush Top-Right Icon & Label */}
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

            {/* Bottom Row: Temperature on left, right side completely open */}
            <div className="relative z-10 flex items-end justify-between mt-auto pt-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl font-black tracking-tight leading-none drop-shadow-xs"
                    style={{ color: textColors.tempColor || '#1F1F1F' }}
                  >
                    {displayTemp}°
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
                    H: {displayHigh}° &nbsp;•&nbsp; L: {displayLow}°
                  </span>
                  <span className="opacity-60">•</span>
                  <span className="font-medium">Feels {displayFeels}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            NAVIGATION TABS
            ======================================================== */}
        <div className="flex items-center gap-2 px-6 pt-2 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.01]">
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
            <span>Wallpaper &amp; Visibility</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'colors'
                ? 'border-[#1878B8] text-[#1878B8] dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Palette size={14} />
            <span>Individual Text Colors</span>
          </button>
        </div>

        {/* ========================================================
            TAB CONTENT (Scrollable Area)
            ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          {activeTab === 'image' ? (
            <div className="space-y-6">
              {/* 1. Location Settings */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={13} className="text-[#1878B8] dark:text-sky-400" />
                  <span>Weather Location (Live API Target)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LOCATIONS.map((loc) => (
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
                    Fahrenheit (°F Primary)
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
                    Celsius (°C Primary)
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
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_WALLPAPERS.map((preset) => {
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
                    onClick={handleApplyCustomUrl}
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
                    min="40"
                    max="100"
                    step="5"
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
                    min="0"
                    max="90"
                    step="5"
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
          ) : (
            /* ========================================================
               TAB 2: INDIVIDUAL TEXT COLORS
               ======================================================== */
            <div className="space-y-6">
              {/* 1-Click Color Themes */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={13} className="text-amber-500 dark:text-amber-400" />
                  <span>1-Click Curated Color Themes</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setTextColors(preset.colors)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#1878B8] dark:hover:border-white/30 bg-slate-50/70 hover:bg-sky-50/50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] transition-all flex items-center justify-between cursor-pointer group text-left"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1878B8] dark:group-hover:text-white">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Pre-balanced contrast for readability
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/30 shadow-xs"
                          style={{ backgroundColor: preset.colors.tempColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/30 shadow-xs"
                          style={{ backgroundColor: preset.colors.locationColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/30 shadow-xs"
                          style={{ backgroundColor: preset.colors.conditionBadgeColor }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Individual Text Color Controls */}
              <div className="space-y-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Palette size={13} className="text-[#1878B8] dark:text-sky-400" />
                  <span>Granular Individual Text Colors</span>
                </div>

                {/* Color Row 1: Main Temp Number */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. Main Temperature Number (72°)
                    </span>
                    <input
                      type="color"
                      value={textColors.tempColor || '#1F1F1F'}
                      onChange={(e) => updateColorKey('tempColor', e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SWATCH_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColorKey('tempColor', color)}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          textColors.tempColor === color
                            ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                            : 'border-slate-300 dark:border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Row 2: Secondary Temp (/ 22°C) */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      2. Secondary Temperature (/ 22°C)
                    </span>
                    <input
                      type="color"
                      value={textColors.secondaryTempColor || '#64748B'}
                      onChange={(e) => updateColorKey('secondaryTempColor', e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SWATCH_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColorKey('secondaryTempColor', color)}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          textColors.secondaryTempColor === color
                            ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                            : 'border-slate-300 dark:border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Row 3: Metrics (High / Low / Feels Like) */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      3. Metrics Line (H: 76° • L: 62° • Feels 74°)
                    </span>
                    <input
                      type="color"
                      value={textColors.metricsColor || '#334155'}
                      onChange={(e) => updateColorKey('metricsColor', e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SWATCH_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColorKey('metricsColor', color)}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          textColors.metricsColor === color
                            ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                            : 'border-slate-300 dark:border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Row 4: Location Name */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      4. Location Badge Text (Oceanside, CA)
                    </span>
                    <input
                      type="color"
                      value={textColors.locationColor || '#0369A1'}
                      onChange={(e) => updateColorKey('locationColor', e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SWATCH_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColorKey('locationColor', color)}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          textColors.locationColor === color
                            ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                            : 'border-slate-300 dark:border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Row 5: Condition Badge Text & Pill Background */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      5. Condition Badge Text ({conditionLabel})
                    </span>
                    <input
                      type="color"
                      value={textColors.conditionBadgeColor || '#1E293B'}
                      onChange={(e) => updateColorKey('conditionBadgeColor', e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SWATCH_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColorKey('conditionBadgeColor', color)}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          textColors.conditionBadgeColor === color
                            ? 'scale-125 border-sky-400 ring-2 ring-sky-400/40'
                            : 'border-slate-300 dark:border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
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
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Factory Defaults</span>
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check size={14} className="stroke-[3]" />
              <span>Apply &amp; Save Changes</span>
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
      title="Reset Weather Widget"
      message="Reset weather widget configuration back to original defaults?"
      confirmLabel="Reset to Defaults"
      variant="warning"
      onConfirm={() => {
        onReset();
        setIsConfirmResetOpen(false);
        onClose();
      }}
      onCancel={() => setIsConfirmResetOpen(false)}
    />
    </>
  );
}
