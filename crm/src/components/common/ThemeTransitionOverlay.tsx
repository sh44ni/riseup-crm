import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';

export interface ThemeTransitionHandle {
  trigger: {
    (targetTheme: 'light' | 'dark', onMidpoint: () => void): void;
    (x: number, y: number, targetTheme: 'light' | 'dark', onMidpoint: () => void): void;
  };
}

interface TransitionState {
  active: boolean;
  targetTheme: 'light' | 'dark';
  stage: 'entering' | 'swapping' | 'leaving';
}

export const ThemeTransitionOverlay = forwardRef<ThemeTransitionHandle>((_, ref) => {
  const [state, setState] = useState<TransitionState>({
    active: false,
    targetTheme: 'light',
    stage: 'entering',
  });

  const trigger = useCallback((...args: any[]) => {
    let targetTheme: 'light' | 'dark' = 'light';
    let onMidpoint = () => {};

    if (typeof args[0] === 'number') {
      // Legacy coordinate signature: (x, y, targetTheme, onMidpoint)
      targetTheme = args[2] === 'dark' ? 'dark' : 'light';
      onMidpoint = typeof args[3] === 'function' ? args[3] : () => {};
    } else {
      // Standard signature: (targetTheme, onMidpoint)
      targetTheme = args[0] === 'dark' ? 'dark' : 'light';
      onMidpoint = typeof args[1] === 'function' ? args[1] : () => {};
    }

    // 1. Immediately activate loading overlay
    setState({ active: true, targetTheme, stage: 'entering' });

    // 2. Perform DOM theme swap while loading screen completely masks the viewport
    const swapTimer = setTimeout(() => {
      onMidpoint();
      setState((prev) => ({ ...prev, stage: 'swapping' }));
    }, 200);

    // 3. Begin smooth fade-out
    const leaveTimer = setTimeout(() => {
      setState((prev) => ({ ...prev, stage: 'leaving' }));
    }, 450);

    // 4. Teardown overlay
    const doneTimer = setTimeout(() => {
      setState({ active: false, targetTheme: 'light', stage: 'entering' });
    }, 620);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    trigger,
  }));

  if (!state.active) return null;

  const isDark = state.targetTheme === 'dark';
  const isLeaving = state.stage === 'leaving';

  return (
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center select-none overflow-hidden transition-all duration-200 ${
        isDark ? 'bg-[#070B12]/80' : 'bg-slate-100/80'
      } backdrop-blur-md ${isLeaving ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ willChange: 'opacity, backdrop-filter' }}
      aria-live="polite"
      aria-label={isDark ? 'Switching to Obsidian Dark Mode' : 'Switching to Coastal Light Mode'}
    >
      {/* Centered Floating Loading Card */}
      <div
        className={`relative rounded-2xl p-6 min-w-[270px] max-w-xs flex flex-col items-center text-center shadow-2xl transition-all duration-300 transform ${
          isLeaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        } ${
          isDark
            ? 'bg-slate-900/90 border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.25)]'
            : 'bg-white/95 border border-slate-200/90 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.15),0_0_30px_rgba(251,191,36,0.25)]'
        }`}
      >
        {/* Animated Dual-Ring Theme Spinner with Icon */}
        <div className="relative w-14 h-14 flex items-center justify-center mb-3">
          {/* Outer glowing spinner ring */}
          <div
            className={`absolute inset-0 rounded-full border-2 animate-spin ${
              isDark
                ? 'border-sky-400/20 border-t-sky-400 border-r-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'border-amber-400/20 border-t-amber-500 border-r-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
            }`}
            style={{ animationDuration: '0.85s' }}
          />

          {/* Theme Icon Center */}
          <div className="relative z-10 flex items-center justify-center">
            {isDark ? (
              <div className="relative">
                <Moon size={22} className="text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
                <Sparkles size={9} className="absolute -top-1 -right-1 text-sky-200 animate-pulse" />
              </div>
            ) : (
              <Sun size={24} className="text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-sun-spin" />
            )}
          </div>
        </div>

        {/* Status Typography */}
        <div className="space-y-0.5">
          <div className="text-xs font-bold tracking-tight">
            {isDark ? 'Switching to Obsidian Dark' : 'Switching to Coastal Light'}
          </div>
          <div className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Optimizing workspace styles...
          </div>
        </div>

        {/* Animated Shimmer Progress Bar */}
        <div
          className={`mt-4 w-44 h-1.5 rounded-full overflow-hidden relative ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isDark
                ? 'bg-gradient-to-r from-sky-400 via-[#1878B8] to-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
            }`}
            style={{
              width: state.stage === 'entering' ? '30%' : state.stage === 'swapping' ? '85%' : '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
});

ThemeTransitionOverlay.displayName = 'ThemeTransitionOverlay';
