import React from 'react';

/**
 * Wraps React.lazy to gracefully handle failed dynamic chunk imports when
 * a new build is deployed and previous chunk hashes are superseded.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const isRefreshed = sessionStorage.getItem('chunk_retry_refreshed') === 'true';
    try {
      const mod = await factory();
      sessionStorage.setItem('chunk_retry_refreshed', 'false');
      return mod.default ? mod : { default: mod };
    } catch (err: any) {
      const isChunkError =
        /Failed to fetch dynamically imported module/i.test(err?.message || '') ||
        /Loading chunk .* failed/i.test(err?.message || '') ||
        /Importing a module script failed/i.test(err?.message || '') ||
        /error loading dynamically imported module/i.test(err?.message || '');

      if (!isRefreshed && isChunkError) {
        sessionStorage.setItem('chunk_retry_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // never resolves because the window is reloading
      }
      throw err;
    }
  });
}
