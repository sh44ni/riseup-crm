import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { History } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Analytics tab registry — the ONLY place to add a new analytics tab.
 *
 * To add one: create `tabs/<name>/<Name>Tab.tsx` (default export), then append an
 * entry below. Routing, permission gating, navigation and lazy loading are derived
 * from this list.
 */
export interface AnalyticsTabDef {
  /** URL segment: /analytics/<id> */
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Permission required to see and open the tab. */
  permission: string;
  component: LazyExoticComponent<ComponentType>;
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
];

export function visibleTabs(
  can: (permission: string) => boolean,
  tabs: readonly AnalyticsTabDef[] = ANALYTICS_TABS,
): AnalyticsTabDef[] {
  return tabs.filter((tab) => can(tab.permission));
}

export function findTab(id: string | undefined, tabs: readonly AnalyticsTabDef[] = ANALYTICS_TABS) {
  return tabs.find((tab) => tab.id === id);
}
