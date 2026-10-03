import React from 'react';

export interface QuoteBannerSettingsTabProps {
  mode: 'single' | 'slideshow';
  cardHeight: 'compact' | 'balanced' | 'tall';
  setCardHeight: (h: 'compact' | 'balanced' | 'tall') => void;
  imageFit: 'cover' | 'contain';
  setImageFit: (f: 'cover' | 'contain') => void;
  autoplay: boolean;
  setAutoplay: (updater: (prev: boolean) => boolean) => void;
  slideDuration: number;
  setSlideDuration: (d: number) => void;
  transitionEffect: 'fade' | 'slide';
  setTransitionEffect: (t: 'fade' | 'slide') => void;
  linkUrl: string;
  setLinkUrl: (u: string) => void;
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
  const heightOptions: { id: 'compact' | 'balanced' | 'tall'; name: string; desc: string }[] = [
    { id: 'compact', name: 'Compact', desc: '105px height' },
    { id: 'balanced', name: 'Balanced', desc: '128px standard' },
    { id: 'tall', name: 'Tall', desc: '155px extended' },
  ];

  return (
    <div className="space-y-6">
      {/* Card Height */}
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
          Sidebar Banner Height
        </label>
        <div className="grid grid-cols-3 gap-3">
          {heightOptions.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setCardHeight(h.id)}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                cardHeight === h.id
                  ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold">{h.name}</div>
              <div className="text-[10px] text-slate-500">{h.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Image Fit Mode */}
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
          Image Fit Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setImageFit('cover')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              imageFit === 'cover'
                ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold">Cover (Full Bleed)</div>
            <div className="text-[10px] text-slate-500">Fills container edge-to-edge</div>
          </button>

          <button
            type="button"
            onClick={() => setImageFit('contain')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              imageFit === 'contain'
                ? 'bg-sky-500/15 border-[#0284c7] dark:border-sky-400 text-slate-900 dark:text-white'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold">Contain (Full Aspect)</div>
            <div className="text-[10px] text-slate-500">Displays complete image without cropping</div>
          </button>
        </div>
      </div>

      {/* Slideshow Specific Settings */}
      {mode === 'slideshow' && (
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Autoplay Slides</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatically advance slides on an interval (pauses on hover)
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoplay((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoplay ? 'bg-sky-500' : 'bg-slate-400 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  autoplay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {autoplay && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">Slide Display Duration</span>
                <span className="font-mono text-[#0284c7] dark:text-sky-400 font-bold">{slideDuration} seconds</span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={slideDuration}
                onChange={(e) => setSlideDuration(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Slide Transition Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransitionEffect('fade')}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  transitionEffect === 'fade'
                    ? 'bg-sky-500/20 border-sky-400 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Smooth Fade
              </button>

              <button
                type="button"
                onClick={() => setTransitionEffect('slide')}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  transitionEffect === 'slide'
                    ? 'bg-sky-500/20 border-sky-400 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Horizontal Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Click-Through URL */}
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
          Optional Click Destination URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="e.g. /pipeline, /tasks, or external https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284c7] dark:focus:border-sky-400"
          />
          {linkUrl && (
            <button
              type="button"
              onClick={() => setLinkUrl('')}
              className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Leave blank if the card should not trigger page navigation when clicked.
        </p>
      </div>
    </div>
  );
}
