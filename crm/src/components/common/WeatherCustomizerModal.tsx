import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Palette, Image as ImageIcon } from 'lucide-react';
import { WeatherWidgetConfig, WeatherTextColors, DEFAULT_TEXT_COLORS } from '@/lib/weatherStore';
import { WeatherData } from '@/api/weatherApi';
import { useToast } from '@/context/ToastContext';
import { CustomizerShell } from './CustomizerShell';
import { WeatherPreview } from './weather/WeatherPreview';
import { WeatherImageTab, PresetWallpaper } from './weather/WeatherImageTab';
import { WeatherColorsTab, ColorPreset } from './weather/WeatherColorsTab';

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

const PRESET_WALLPAPERS: PresetWallpaper[] = [
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

const COLOR_PRESETS: ColorPreset[] = [
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

  const badge = (
    <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[#1878B8] dark:text-sky-300 text-[10px] font-black uppercase tracking-wider">
      IMAGE &amp; TEXT COLORS
    </span>
  );

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<Sliders size={18} className="stroke-[2.5]" />}
      title="Weather Widget Customizer"
      subtitle="Customize background wallpaper, clarity, and individual text colors. Weather data is live from the API."
      badge={badge}
      onReset={onReset}
      resetLabel="Reset to Factory Defaults"
      resetConfirmTitle="Reset Weather Widget"
      resetConfirmMessage="Reset weather widget configuration back to original defaults?"
      onSave={handleSave}
      saveLabel="Apply & Save Changes"
    >
      <WeatherPreview
        weatherData={weatherData}
        customImage={customImage}
        imageOpacity={imageOpacity}
        overlayStrength={overlayStrength}
        location={location}
        textColors={textColors}
        tempUnit={tempUnit}
      />

      {/* Navigation Tabs */}
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

      {/* Tab Content */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
        {activeTab === 'image' ? (
          <WeatherImageTab
            location={location}
            setLocation={setLocation}
            presetLocations={PRESET_LOCATIONS}
            tempUnit={tempUnit}
            setTempUnit={setTempUnit}
            customImage={customImage}
            setCustomImage={setCustomImage}
            presetWallpapers={PRESET_WALLPAPERS}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            customUrlInput={customUrlInput}
            setCustomUrlInput={setCustomUrlInput}
            onApplyCustomUrl={handleApplyCustomUrl}
            imageOpacity={imageOpacity}
            setImageOpacity={setImageOpacity}
            overlayStrength={overlayStrength}
            setOverlayStrength={setOverlayStrength}
          />
        ) : (
          <WeatherColorsTab
            textColors={textColors}
            updateColorKey={updateColorKey}
            setTextColors={setTextColors}
            colorPresets={COLOR_PRESETS}
            swatchPalette={SWATCH_PALETTE}
            conditionLabel={weatherData.condition_text || 'Sunny'}
          />
        )}
      </div>
    </CustomizerShell>
  );
}

export default WeatherCustomizerModal;
