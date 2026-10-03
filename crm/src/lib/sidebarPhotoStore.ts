import { useCallback } from 'react';
import { useCustomizationMutations, useMySlot } from '@/hooks/useMyCustomizations';

export const SIDEBAR_SLOT = 'sidebar';

/** Per-user sidebar photo. Empty string = nothing uploaded (neutral obsidian sidebar). */
export function useSidebarPhoto() {
  const { config } = useMySlot<{ photo_url?: string }>(SIDEBAR_SLOT);
  const { save, reset, isSaving } = useCustomizationMutations();

  const photoUrl = (config?.photo_url as string | undefined) || '';

  const savePhoto = useCallback(
    (url: string): Promise<boolean> => save(SIDEBAR_SLOT, { photo_url: url || '' }),
    [save]
  );
  const resetPhoto = useCallback(() => reset(SIDEBAR_SLOT), [reset]);

  return { photoUrl, savePhoto, resetPhoto, isSaving };
}
