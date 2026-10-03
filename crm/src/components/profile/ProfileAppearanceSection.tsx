import React from 'react';
import { Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function ProfileAppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-400 flex items-center justify-center">
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Appearance & Theme
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Switch between luminous Coastal Light glass and deep Obsidian Dark glass.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {theme === 'dark' ? 'Obsidian Dark' : 'Coastal Light'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
            theme === 'light'
              ? 'bg-white dark:bg-slate-800 border-[#1878B8] shadow-sm ring-2 ring-[#1878B8]/20'
              : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-white/10 opacity-70 hover:opacity-100'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/40">
            <Sun size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Coastal Light</span>
              {theme === 'light' && <Check size={12} className="text-[#1878B8]" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Frosted white glass & luminous daylight
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 border-[#55C4F5] shadow-sm ring-2 ring-[#55C4F5]/30'
              : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-white/10 opacity-70 hover:opacity-100'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-sky-950 text-sky-400 flex items-center justify-center shrink-0 border border-sky-800/40">
            <Moon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Obsidian Dark</span>
              {theme === 'dark' && <Check size={12} className="text-[#55C4F5]" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Deep midnight glass & cyan highlights
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
