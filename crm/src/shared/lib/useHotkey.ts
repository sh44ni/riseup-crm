import { useEffect } from 'react';

export interface UseHotkeyOptions {
  metaOrCtrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useHotkey(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: UseHotkeyOptions = {}
) {
  const {
    metaOrCtrl = false,
    shift = false,
    alt = false,
    enabled = true,
    preventDefault = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMatches = e.key.toLowerCase() === key.toLowerCase();
      const metaCtrlMatches = metaOrCtrl ? e.metaKey || e.ctrlKey : true;
      const shiftMatches = shift ? e.shiftKey : !e.shiftKey;
      const altMatches = alt ? e.altKey : !e.altKey;

      if (keyMatches && metaCtrlMatches && shiftMatches && altMatches) {
        if (preventDefault) {
          e.preventDefault();
        }
        callback(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, metaOrCtrl, shift, alt, enabled, preventDefault]);
}
