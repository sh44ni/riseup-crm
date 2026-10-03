import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DefaultBannerText } from '@/lib/heroBannerStore';

export interface HeroBannerTextTabProps {
  eyebrow: string;
  setEyebrow: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  subtitle: string;
  setSubtitle: (val: string) => void;
  defaultText: DefaultBannerText;
  limitEyebrow?: number;
  limitTitle?: number;
  limitSubtitle?: number;
}

export function HeroBannerTextTab({
  eyebrow,
  setEyebrow,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  defaultText,
  limitEyebrow = 80,
  limitTitle = 60,
  limitSubtitle = 160,
}: HeroBannerTextTabProps) {
  return (
    <div className="space-y-4">
      {/* Eyebrow / Tagline */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Eyebrow Badge Text
          </label>
          <span
            className={`text-[10.5px] font-mono font-bold ${
              eyebrow.length >= limitEyebrow ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
            }`}
          >
            {eyebrow.length} / {limitEyebrow}
          </span>
        </div>
        <input
          type="text"
          maxLength={limitEyebrow}
          value={eyebrow}
          onChange={(e) => setEyebrow(e.target.value)}
          placeholder={defaultText.eyebrow}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 focus:border-[#1878B8] dark:focus:border-sky-400 focus:outline-none text-xs text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-600"
        />
      </div>

      {/* Main Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Main Headline Title
          </label>
          <span
            className={`text-[10.5px] font-mono font-bold ${
              title.length >= limitTitle ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
            }`}
          >
            {title.length} / {limitTitle}
          </span>
        </div>
        <input
          type="text"
          maxLength={limitTitle}
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
              subtitle.length >= limitSubtitle ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
            }`}
          >
            {subtitle.length} / {limitSubtitle}
          </span>
        </div>
        <textarea
          rows={2}
          maxLength={limitSubtitle}
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
  );
}
