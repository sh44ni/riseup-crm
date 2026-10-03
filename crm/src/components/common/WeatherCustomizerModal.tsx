import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Palette, Image as ImageIcon } from 'lucide-react';
import {
  WeatherWidgetConfig,
  WeatherTextColors,
  DEFAULT_TEXT_COLORS,
  FALLBACK_WEATHER_LOCATION,
} from '@/lib/weatherStore';
import { WeatherData } from '@/api/weatherApi';
import { CustomizerShell } from './CustomizerShell';
import { CustomizerBody, CustomizerTabs } from './customizer/CustomizerParts';
import { WeatherPreview } from './weather/WeatherPreview';
import { WeatherImageTab } from './weather/WeatherImageTab';
import { WeatherColorsTab, ColorPreset } from './weather/WeatherColorsTab';

export interface WeatherCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: WeatherWidgetConfig;
  weatherData: WeatherData;
  /** Resolves true when the server accepted the change. */
  onSave: (config: WeatherWidgetConfig) => Promise<boolean>;
  onReset: () => Promise<boolean>;
  isSaving?: boolean;
}

const PRESET_LOCATIONS = [
  'Oceanside, CA',
  'Carlsbad, CA',
  'San Diego, CA',
  'Vista, CA',
  'Encinitas, CA',
  'Poway, CA',
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
  isSaving = false,
}: WeatherCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'colors'>('image');

  // Draft is initialised once per open; background refetches never overwrite edits.
  const [location, setLocation] = useState(currentConfig.location);
  const [customImage, setCustomImage] = useState(currentConfig.customImage);
  const [imageOpacity, setImageOpacity] = useState(currentConfig.imageOpacity);
  const [overlayStrength, setOverlayStrength] = useState(currentConfig.overlayStrength);
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(currentConfig.tempUnit);
  const [textColors, setTextColors] = useState<WeatherTextColors>({
    ...DEFAULT_TEXT_COLORS,
    ...(currentConfig.textColors || {}),
  });

  const latest = useRef(currentConfig);
  latest.current = currentConfig;

  useEffect(() => {
    if (!isOpen) return;
    const c = latest.current;
    setLocation(c.location);
    setCustomImage(c.customImage);
    setImageOpacity(c.imageOpacity);
    setOverlayStrength(c.overlayStrength);
    setTempUnit(c.tempUnit);
    setTextColors({ ...DEFAULT_TEXT_COLORS, ...(c.textColors || {}) });
    setActiveTab('image');
  }, [isOpen]);

  const updateColorKey = (key: keyof WeatherTextColors, value: string) => {
    setTextColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const ok = await onSave({
      location: location.trim(),
      customImage,
      imageOpacity,
      overlayStrength,
      tempUnit,
      textColors,
    });
    if (ok) onClose();
  };

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<Sliders size={18} className="stroke-[2.5]" />}
      title="Weather Widget"
      subtitle="Background image, location and text colors. Weather data is live."
      onReset={() => void onReset()}
      resetLabel="Clear widget"
      resetConfirmTitle="Clear weather widget"
      resetConfirmMessage="Remove your weather background and settings?"
      onSave={handleSave}
      saveLabel="Save"
      isSaving={isSaving}
    >
      <WeatherPreview
        weatherData={weatherData}
        customImage={customImage}
        imageOpacity={imageOpacity}
        overlayStrength={overlayStrength}
        location={location.trim() || FALLBACK_WEATHER_LOCATION}
        textColors={textColors}
        tempUnit={tempUnit}
      />

      <CustomizerTabs
        tabs={[
          { id: 'image', label: 'Image & location', icon: <ImageIcon size={14} /> },
          { id: 'colors', label: 'Text colors', icon: <Palette size={14} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <CustomizerBody>
        {activeTab === 'image' ? (
          <WeatherImageTab
            location={location}
            setLocation={setLocation}
            presetLocations={PRESET_LOCATIONS}
            tempUnit={tempUnit}
            setTempUnit={setTempUnit}
            customImage={customImage}
            setCustomImage={setCustomImage}
            imageOpacity={imageOpacity}
            setImageOpacity={setImageOpacity}
            overlayStrength={overlayStrength}
            setOverlayStrength={setOverlayStrength}
            locationPlaceholder={FALLBACK_WEATHER_LOCATION}
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
      </CustomizerBody>
    </CustomizerShell>
  );
}

export default WeatherCustomizerModal;
