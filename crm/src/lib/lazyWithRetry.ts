import React from 'react';
import { isChunkLoadError, reloadOnceForNewDeploy } from '@/lib/chunkReload';

/**
 * Wraps React.lazy to gracefully handle failed dynamic chunk imports when
 * a new build is deployed and previous chunk hashes are superseded.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const mod = await factory();
      return mod.default ? mod : { default: mod };
    } catch (err: any) {
      if (isChunkLoadError(err) && reloadOnceForNewDeploy()) {
        return new Promise(() => {}); // never resolves because the window is reloading
      }
      throw err;
    }
  });
}
