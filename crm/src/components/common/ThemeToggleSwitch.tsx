import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleSwitchProps {
  variant?: 'pill' | 'compact' | 'icon' | 'dock';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggleSwitch({
  variant = 'compact',
  showLabel = false,
  className = '',
}: ThemeToggleSwitchProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggleTheme(e);
  };

  // 1. Icon-only single circular button
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={isDark ? 'Switch to Coastal Light Mode (Ctrl+Shift+L)' : 'Switch to Obsidian Dark Mode (Ctrl+Shift+L)'}
        aria-label="Toggle Theme"
        className={`relative p-2 rounded-xl border transition-all duration-300 cursor-pointer group active:scale-92 overflow-hidden ${
          isDark
            ? 'bg-slate-900/80 border-white/10 hover:border-sky-400/40 text-sky-300 hover:text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]'
            : 'bg-white/80 border-slate-200/80 hover:border-amber-400/40 text-amber-600 hover:text-amber-500 shadow-xs hover:shadow-md'
        } ${className}`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${
              isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`}
          >
            <Sun size={18} className="text-amber-500 animate-sun-spin" />
          </div>

          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            }`}
          >
            <Moon size={17} className="text-sky-300" />
            <Sparkles size={8} className="absolute -top-0.5 -right-0.5 text-sky-200 animate-pulse" />
          </div>
        </div>
      </button>
    );
  }

  // 2. Labeled dual-button pill
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-0.5 rounded-xl border transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/80 border-white/10'
            : 'bg-slate-200/70 border-slate-300/60'
        } ${className}`}
      >
        <button
          type="button"
          onClick={(e) => theme !== 'light' && toggleTheme(e)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            !isDark
              ? 'bg-white text-slate-900 shadow-xs scale-100'
              : 'text-slate-400 hover:text-slate-200 opacity-70 hover:opacity-100'
          }`}
        >
          <Sun
            size={13}
            className={`${!isDark ? 'text-amber-500 animate-sun-spin' : 'text-slate-400'}`}
          />
          {showLabel && <span>Light</span>}
        </button>

        <button
          type="button"
          onClick={(e) => theme !== 'dark' && toggleTheme(e)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            isDark
              ? 'bg-[#1878B8] text-white shadow-xs scale-100'
              : 'text-slate-500 hover:text-slate-700 opacity-70 hover:opacity-100'
          }`}
        >
          <Moon
            size={13}
            className={`${isDark ? 'text-sky-200' : 'text-slate-400'}`}
          />
          {showLabel && <span>Dark</span>}
        </button>
      </div>
    );
  }

  // 3. Compact Sliding Toggle Switch (Used for 'compact' and updated 'dock')
  const toggleSwitchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to Coastal Light Mode' : 'Switch to Obsidian Dark Mode'}
      title={isDark ? 'Switch to Coastal Light Mode (Ctrl+Shift+L)' : 'Switch to Obsidian Dark Mode (Ctrl+Shift+L)'}
      onClick={handleToggle}
      className="relative inline-flex items-center h-7 w-[58px] p-0.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-sky-400/40 transition-all duration-300 cursor-pointer shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 group select-none shrink-0"
    >
      {/* Animated Sliding Thumb with glowing Sun/Moon */}
      <span
        aria-hidden="true"
        className={`absolute top-0.5 bottom-0.5 w-6 rounded-full transition-transform duration-300 ease-out flex items-center justify-center pointer-events-none ${
          isDark
            ? 'translate-x-[30px] bg-gradient-to-tr from-[#1878B8] to-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.6)] border border-sky-300/50'
            : 'translate-x-0 bg-gradient-to-tr from-amber-400 to-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)] border border-amber-300/60'
        }`}
      >
        {isDark ? (
          <Moon size={12} className="text-white drop-shadow-xs" />
        ) : (
          <Sun size={12} className="text-white drop-shadow-xs animate-sun-spin" />
        )}
      </span>

      {/* Stationary Track Icon: Sun (Left) */}
      <span className="w-6 h-6 flex items-center justify-center z-0 text-slate-400 pointer-events-none">
        <Sun
          size={12}
          className={`transition-opacity duration-200 ${
            !isDark ? 'opacity-0' : 'opacity-70 group-hover:opacity-100 group-hover:text-amber-300'
          }`}
        />
      </span>

      {/* Stationary Track Icon: Moon (Right) */}
      <span className="w-6 h-6 flex items-center justify-center ml-auto z-0 text-slate-400 pointer-events-none">
        <Moon
          size={12}
          className={`transition-opacity duration-200 ${
            isDark ? 'opacity-0' : 'opacity-70 group-hover:opacity-100 group-hover:text-sky-300'
          }`}
        />
      </span>
    </button>
  );

  // If dock variant or showLabel is requested, wrap in sleek appearance row
  if (variant === 'dock' || showLabel) {
    return (
      <div className={`flex items-center justify-between gap-2 w-full select-none ${className}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300/80">
            Theme
          </span>
          <span className="text-[10px] font-semibold text-sky-400">
            {isDark ? 'Obsidian' : 'Coastal'}
          </span>
        </div>
        {toggleSwitchButton}
      </div>
    );
  }

  // Pure compact toggle switch
  return <div className={`inline-flex items-center ${className}`}>{toggleSwitchButton}</div>;
}
