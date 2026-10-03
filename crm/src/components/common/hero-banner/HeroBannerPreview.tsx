import React, { RefObject } from 'react';
import { Move } from 'lucide-react';
import { DefaultBannerText } from '@/lib/heroBannerStore';

export interface HeroBannerPreviewProps {
  previewContainerRef: RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  imageUrl: string;
  zoom: number;
  positionX: number;
  positionY: number;
  opacity: number;
  overlayStrength: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  defaultText: DefaultBannerText;
}

export function HeroBannerPreview({
  previewContainerRef,
  isDragging,
  onMouseDown,
  imageUrl,
  zoom,
  positionX,
  positionY,
  opacity,
  overlayStrength,
  eyebrow,
  title,
  subtitle,
  defaultText,
}: HeroBannerPreviewProps) {
  return (
    <div className="px-6 pt-5 pb-1 bg-slate-50/50 dark:bg-white/[0.01] shrink-0 border-b border-slate-200/80 dark:border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Preview &bull; Drag to reframe
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Zoom: {zoom}% &bull; Focal ({positionX}%, {positionY}%)
        </span>
      </div>

      <div
        ref={previewContainerRef}
        onMouseDown={onMouseDown}
        className={`relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden border transition-shadow ${
          isDragging
            ? 'border-[#1878B8] dark:border-sky-400 cursor-grabbing'
            : 'border-slate-300 dark:border-white/20 cursor-grab'
        } shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] select-none bg-slate-900`}
        title="Click and drag to pan image"
      >
        {/* Dynamic Background Image */}
        <div
          className="absolute inset-0 bg-no-repeat transition-transform duration-75 pointer-events-none"
          style={{
            backgroundImage: imageUrl ? `url('${imageUrl}')` : 'none',
            backgroundSize: `${zoom}% auto`,
            backgroundPosition: `${positionX}% ${positionY}%`,
            opacity: opacity / 100,
          }}
        />

        {/* Ambient Gradient Wash */}
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

        {/* Typography Overlay */}
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
  );
}
