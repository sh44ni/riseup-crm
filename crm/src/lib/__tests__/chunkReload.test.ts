import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  installPreloadErrorHandler,
  isChunkLoadError,
  reloadOnceForNewDeploy,
} from '../chunkReload';

describe('chunkReload', () => {
  const reload = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it.each([
    'Failed to fetch dynamically imported module: /assets/x.js',
    'Loading chunk 12 failed.',
    'Importing a module script failed.',
    'error loading dynamically imported module',
  ])('recognises chunk error: %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('does not treat other errors as chunk errors', () => {
    expect(isChunkLoadError(new Error('Network down'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('reloads once, then respects the cool-down (no reload loop)', () => {
    expect(reloadOnceForNewDeploy(100_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    expect(reloadOnceForNewDeploy(100_000 + CHUNK_RELOAD_COOLDOWN_MS)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    expect(reloadOnceForNewDeploy(100_000 + CHUNK_RELOAD_COOLDOWN_MS + 1)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('uses a single sessionStorage key', () => {
    reloadOnceForNewDeploy(1_700_000_000_000);
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem('chunk_reload_at')).toBe('1700000000000');
  });

  it('vite:preloadError triggers the shared reload', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    installPreloadErrorHandler();
    window.dispatchEvent(new Event('vite:preloadError'));
    expect(reload).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
