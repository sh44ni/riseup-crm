import { useAuth } from '@/context/AuthContext';
import { FeatureFlag } from './types';

export function useFeature(flag: FeatureFlag): boolean {
  const { user } = useAuth();

  // Allow explicit opt-in via environment variable for local dev/testing
  if (import.meta.env.VITE_ENABLE_UNFINISHED_PAGES === 'true') {
    return true;
  }

  // Check if user has explicit feature flag enabled from backend /me
  if (user && 'features' in user && typeof user.features === 'object' && user.features !== null) {
    const userFeatures = user.features as Record<string, boolean>;
    if (userFeatures[flag] === true) {
      return true;
    }
  }

  // Unfinished pages are off by default
  return false;
}
