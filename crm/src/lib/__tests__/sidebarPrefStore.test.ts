import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSidebarStorageKey,
  getSavedPinned,
  savePinned,
  SIDEBAR_PINNED_STORAGE_KEY_PREFIX,
} from '../sidebarPrefStore';

describe('sidebarPrefStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates user-specific storage keys', () => {
    expect(getSidebarStorageKey('user-123')).toBe(
      `${SIDEBAR_PINNED_STORAGE_KEY_PREFIX}:user-123`
    );
    expect(getSidebarStorageKey()).toBe(
      `${SIDEBAR_PINNED_STORAGE_KEY_PREFIX}:default`
    );
  });

  it('defaults to pinned (true) when no preference is saved', () => {
    expect(getSavedPinned('user-456')).toBe(true);
    expect(getSavedPinned()).toBe(true);
  });

  it('saves and reads unpinned (false) preference per user', () => {
    savePinned(false, 'user-1');
    expect(getSavedPinned('user-1')).toBe(false);

    // Another user still defaults to true
    expect(getSavedPinned('user-2')).toBe(true);

    // Update user-2 to false, user-1 back to true
    savePinned(false, 'user-2');
    savePinned(true, 'user-1');
    expect(getSavedPinned('user-1')).toBe(true);
    expect(getSavedPinned('user-2')).toBe(false);
  });

  it('gracefully handles corrupted localStorage values', () => {
    const key = getSidebarStorageKey('user-corrupt');
    localStorage.setItem(key, '{not-valid-json');
    expect(getSavedPinned('user-corrupt')).toBe(true);
  });
});
