import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeature } from './useFeature';
import { FeatureFlag } from './types';

export interface FeatureRouteProps {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureRoute({
  feature,
  children,
  fallback = <Navigate to="/" replace />,
}: FeatureRouteProps) {
  const isEnabled = useFeature(feature);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
