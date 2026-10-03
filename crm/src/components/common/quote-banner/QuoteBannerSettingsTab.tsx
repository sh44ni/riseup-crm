import React from 'react';
import { CustomizerSection, SliderField, ToggleField } from '../customizer/CustomizerParts';

type Height = 'compact' | 'balanced' | 'tall';
type Fit = 'cover' | 'contain';
type Effect = 'fade' | 'slide';

export interface QuoteBannerSettingsTabProps {
  mode: 'single' | 'slideshow';
  cardHeight: Height;
  setCardHeight: (h: Height) => void;
  imageFit: Fit;
  setImageFit: (f: Fit) => void;
  autoplay: boolean;
  setAutoplay: (v: boolean) => void;
  slideDuration: number;
  setSlideDuration: (d: number) => void;
  transitionEffect: Effect;
  setTransitionEffect: (t: Effect) => void;
  linkUrl: string;
  setLinkUrl: (u: string) => void;
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; name: string; desc?: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              value === o.id
                ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold">{o.name}</div>
            {o.desc && <div className="text-[10px] text-slate-500">{o.desc}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuoteBannerSettingsTab({
  mode,
  cardHeight,
  setCardHeight,
  imageFit,
  setImageFit,
  autoplay,
  setAutoplay,
  slideDuration,
  setSlideDuration,
  transitionEffect,
  setTransitionEffect,
  linkUrl,
  setLinkUrl,
}: QuoteBannerSettingsTabProps) {
  return (
    <div className="space-y-5">
      <CustomizerSection title="Appearance">
        <Choice
          label="Banner height"
          value={cardHeight}
          onChange={setCardHeight}
          options={[
            { id: 'compact', name: 'Compact', desc: '105px' },
            { id: 'balanced', name: 'Balanced', desc: '128px' },
            { id: 'tall', name: 'Tall', desc: '155px' },
          ]}
        />
        <Choice
          label="Image fit"
          value={imageFit}
          onChange={setImageFit}
          options={[
            { id: 'cover', name: 'Cover', desc: 'Fills the card edge to edge' },
            { id: 'contain', name: 'Contain', desc: 'Shows the whole image' },
          ]}
        />
      </CustomizerSection>

      {mode === 'slideshow' && (
        <CustomizerSection title="Slideshow">
          <ToggleField
            label="Autoplay"
            description="Advance slides automatically (pauses on hover)"
            checked={autoplay}
            onChange={setAutoplay}
          />
          {autoplay && (
            <SliderField label="Seconds per slide" value={slideDuration} min={2} max={15} unit="s" onChange={setSlideDuration} />
          )}
          <Choice
            label="Transition"
            value={transitionEffect}
            onChange={setTransitionEffect}
            options={[
              { id: 'fade', name: 'Fade' },
              { id: 'slide', name: 'Slide' },
            ]}
          />
        </CustomizerSection>
      )}

      <CustomizerSection title="Click destination" description="Optional. Leave blank if the banner shouldn't be clickable.">
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Click destination"
            placeholder="e.g. /pipeline or https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0284c7] dark:focus:border-sky-400"
          />
          {linkUrl && (
            <button type="button" onClick={() => setLinkUrl('')} className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 text-xs cursor-pointer">
              Clear
            </button>
          )}
        </div>
      </CustomizerSection>
    </div>
  );
}
