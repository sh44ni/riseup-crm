import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ThemeTransitionOverlay, ThemeTransitionHandle } from '@/components/common/ThemeTransitionOverlay';

export type Theme = 'light' | 'dark';

export type ThemeOrigin = 
  | { x: number; y: number } 
  | React.MouseEvent<any> 
  | MouseEvent 
  | null 
  | undefined;

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void;
  toggleTheme: (origin?: ThemeOrigin) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'crm_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const overlayRef = useRef<ThemeTransitionHandle | null>(null);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
    return 'light'; // Default to light mode
  });

  const applyThemeToDOM = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors in private browsing
    }
  }, []);

  // Initial synchronization with DOM on mount
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  const triggerThemeTransition = useCallback((targetTheme: Theme, _origin?: ThemeOrigin) => {
    if (typeof window === 'undefined') return;

    if (overlayRef.current) {
      overlayRef.current.trigger(targetTheme, () => {
        setThemeState(targetTheme);
        applyThemeToDOM(targetTheme);
      });
    } else {
      setThemeState(targetTheme);
      applyThemeToDOM(targetTheme);
    }
  }, [applyThemeToDOM]);

  const setTheme = useCallback((newTheme: Theme, origin?: ThemeOrigin) => {
    if (newTheme === theme) return;
    triggerThemeTransition(newTheme, origin);
  }, [theme, triggerThemeTransition]);

  const toggleTheme = useCallback((origin?: ThemeOrigin) => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    triggerThemeTransition(nextTheme, origin);
  }, [theme, triggerThemeTransition]);

  // Global Keyboard Shortcut: Ctrl+Shift+L or Cmd+Shift+L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
      }}
    >
      {children}
      <ThemeTransitionOverlay ref={overlayRef} />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
