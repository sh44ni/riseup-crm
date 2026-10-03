/**
 * Single place that handles "a new deployment replaced the chunk files" failures.
 *
 * Used by `lazyWithRetry`, the `ErrorBoundary`, and the global `vite:preloadError` handler, so
 * all three share one sessionStorage key and one cool-down (no reload loops).
 */

const STORAGE_KEY = 'chunk_reload_at';
export const CHUNK_RELOAD_COOLDOWN_MS = 8000;

const CHUNK_ERROR_PATTERNS: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i,
  /Loading chunk .* failed/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return message !== '' && CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Reloads the page unless we already reloaded within the cool-down window.
 * @returns true if a reload was triggered.
 */
export function reloadOnceForNewDeploy(now: number = Date.now()): boolean {
  const lastReload = parseInt(sessionStorage.getItem(STORAGE_KEY) ?? '0', 10);
  if (now - lastReload <= CHUNK_RELOAD_COOLDOWN_MS) {
    return false;
  }
  sessionStorage.setItem(STORAGE_KEY, String(now));
  window.location.reload();
  return true;
}

export function installPreloadErrorHandler(): void {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Preload error detected (stale deployment chunk). Reloading...', event);
    reloadOnceForNewDeploy();
  });
}
