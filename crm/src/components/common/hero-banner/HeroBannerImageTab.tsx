import React from 'react';
import { Globe } from 'lucide-react';
import { ImageUploadField, IMAGE_SPECS } from '../customizer/ImageUploadField';
import { CustomizerSection, SliderField, ToggleField } from '../customizer/CustomizerParts';

export interface HeroBannerImageTabProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
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

const ANCHORS: Array<{ label: string; x: number }> = [
  { label: 'Left', x: 0 },
  { label: 'Center', x: 50 },
  { label: 'Right', x: 100 },
];

export function HeroBannerImageTab({
  imageUrl,
  setImageUrl,
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
    <div className="space-y-5">
      <ImageUploadField
        label="Banner image"
        images={imageUrl ? [imageUrl] : []}
        onChange={(urls) => setImageUrl(urls[0] ?? '')}
        spec={IMAGE_SPECS.hero}
      />

      <CustomizerSection
        title="Framing"
        action={
          <div className="flex items-center gap-1">
            {ANCHORS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setPositionX(a.x);
                  setPositionY(50);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300/80 dark:border-white/10 cursor-pointer"
              >
                {a.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SliderField label="Zoom / Scale" value={zoom} min={100} max={250} step={5} onChange={setZoom} hint={['100% (Fit)', '250% (Tight)']} />
          <SliderField label="Horizontal Pan (X)" value={positionX} min={0} max={100} onChange={setPositionX} hint={['Left', 'Right']} />
          <SliderField label="Vertical Pan (Y)" value={positionY} min={0} max={100} onChange={setPositionY} hint={['Top', 'Bottom']} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80 dark:border-white/5">
          <SliderField label="Photo Opacity" value={opacity} min={30} max={100} step={5} onChange={setOpacity} />
          <SliderField label="Glass Contrast Overlay" value={overlayStrength} min={0} max={100} step={5} onChange={setOverlayStrength} />
        </div>
      </CustomizerSection>

      <CustomizerSection title="Where to apply">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-[#1878B8] dark:text-sky-400 flex items-center justify-center border border-sky-400/30 shrink-0">
            <Globe size={16} />
          </div>
          <div className="flex-1">
            <ToggleField
              label="Apply image & framing to all pages"
              description="Uses this image, zoom and framing on every page. Each page keeps its own text. Turn off to set this page only."
              checked={applyGlobally}
              onChange={setApplyGlobally}
            />
          </div>
        </div>
      </CustomizerSection>
    </div>
  );
}
