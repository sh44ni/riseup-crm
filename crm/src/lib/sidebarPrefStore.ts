import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export const SIDEBAR_PINNED_STORAGE_KEY_PREFIX = 'riseup.sidebar.pinned.v1';

export function getSidebarStorageKey(userId?: string): string {
  return `${SIDEBAR_PINNED_STORAGE_KEY_PREFIX}:${userId || 'default'}`;
}

export function getSavedPinned(userId?: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = getSidebarStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw === null) return true; // Default: pinned (expanded)
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function savePinned(pinned: boolean, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getSidebarStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(pinned));
  } catch {
    // Ignore localStorage quota or private mode errors
  }
}

export function useSidebarPin() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : 'default';

  const [isPinned, setIsPinnedState] = useState<boolean>(() => getSavedPinned(userId));

  // Sync when user changes
  useEffect(() => {
    setIsPinnedState(getSavedPinned(userId));
  }, [userId]);

  const setPinned = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsPinnedState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        savePinned(next, userId);
        return next;
      });
    },
    [userId]
  );

  const togglePinned = useCallback(() => {
    setPinned((prev) => !prev);
  }, [setPinned]);

  // Sync across tabs/windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const key = getSidebarStorageKey(userId);
      if (e.key === key && e.newValue !== null) {
        try {
          setIsPinnedState(JSON.parse(e.newValue) === true);
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId]);

  return { isPinned, setPinned, togglePinned };
}
