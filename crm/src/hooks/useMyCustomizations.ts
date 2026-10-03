import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CustomizationMap,
  MY_CUSTOMIZATIONS_KEY,
  fetchMyCustomizations,
  resetMyCustomization,
  saveMyCustomization,
} from '@/api/customizationsApi';
import { useToast } from '@/context/ToastContext';

/** The signed-in user's whole customization map (server is the single source of truth). */
export function useMyCustomizationMap() {
  return useQuery({
    queryKey: MY_CUSTOMIZATIONS_KEY,
    queryFn: fetchMyCustomizations,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Save/reset for a slot. The server returns the full map which replaces the cache,
 * so the UI always shows exactly what was stored. Failures surface a toast and
 * re-throw so the caller can keep the popup open.
 */
export function useCustomizationMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: ({ slotKey, body }: { slotKey: string; body: Record<string, unknown> }) =>
      saveMyCustomization(slotKey, body),
    onSuccess: (map: CustomizationMap) => queryClient.setQueryData(MY_CUSTOMIZATIONS_KEY, map),
  });
  const resetMutation = useMutation({
    mutationFn: (slotKey: string) => resetMyCustomization(slotKey),
    onSuccess: (map: CustomizationMap) => queryClient.setQueryData(MY_CUSTOMIZATIONS_KEY, map),
  });

  const save = useCallback(
    async (slotKey: string, body: Record<string, unknown>): Promise<boolean> => {
      try {
        await saveMutation.mutateAsync({ slotKey, body });
        return true;
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : 'Could not save your changes.');
        return false;
      }
    },
    [saveMutation, toast]
  );

  const reset = useCallback(
    async (slotKey: string): Promise<boolean> => {
      try {
        await resetMutation.mutateAsync(slotKey);
        return true;
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : 'Could not reset.');
        return false;
      }
    },
    [resetMutation, toast]
  );

  return { save, reset, isSaving: saveMutation.isPending || resetMutation.isPending };
}

/** Typed accessor for one slot; `undefined` means "never customized" (empty state). */
export function useMySlot<T extends Record<string, unknown>>(slotKey: string) {
  const query = useMyCustomizationMap();
  return {
    config: query.data?.[slotKey] as Partial<T> | undefined,
    isLoading: query.isLoading,
    map: query.data,
  };
}
