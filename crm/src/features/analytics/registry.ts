import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { History, Target, Trophy, Radio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Analytics tab registry — the ONLY place to add a new analytics tab.
 *
 * To add one: create `tabs/<name>/<Name>Tab.tsx` (default export), then append an
 * entry below with a `component`. Routing, permission gating, navigation and lazy
 * loading are derived from this list. Entries without a `component` render as
 * greyed-out "Soon" tabs.
 */
export interface AnalyticsTabDef {
  /** URL segment: /analytics/<id> */
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Permission required to see and open the tab. */
  permission: string;
  /** Omit for a tab that is announced but not built yet. */
  component?: LazyExoticComponent<ComponentType>;
}

export const ANALYTICS_TABS: readonly AnalyticsTabDef[] = [
  {
    id: 'activity',
    label: 'Activity',
    description: 'Who changed what, and when, across the CRM.',
    icon: History,
    permission: 'activity.view',
    component: lazy(() => import('./tabs/activity/ActivityTab')),
  },
  {
    id: 'lead-sources',
    label: 'Lead Sources',
    description: 'Where your leads come from.',
    icon: Target,
    permission: 'activity.view',
  },
  {
    id: 'conversion',
    label: 'Conversion',
    description: 'Who is converting more.',
    icon: Trophy,
    permission: 'activity.view',
  },
  {
    id: 'channels',
    label: 'Channels',
    description: 'Which channels perform best.',
    icon: Radio,
    permission: 'activity.view',
  },
];

export const isLive = (tab: AnalyticsTabDef): boolean => Boolean(tab.component);

export function visibleTabs(
  can: (permission: string) => boolean,
  tabs: readonly AnalyticsTabDef[] = ANALYTICS_TABS,
): AnalyticsTabDef[] {
  return tabs.filter((tab) => can(tab.permission));
}

/** Finds a tab that can actually be opened (live). */
export function findTab(id: string | undefined, tabs: readonly AnalyticsTabDef[] = ANALYTICS_TABS) {
  return tabs.find((tab) => tab.id === id && isLive(tab));
}
