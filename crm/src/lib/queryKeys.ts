/**
 * Standardized Query Key Factories for React Query across Rise Up CRM
 * Enforces strict cache isolation, granular invalidation, and type-safe keys.
 */

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  pipeline: {
    all: () => ['pipeline'] as const,
    deals: (params?: Record<string, any>) => ['pipeline', 'deals', params ?? {}] as const,
    analytics: () => ['pipeline', 'analytics'] as const,
    summary: () => ['pipeline', 'summary'] as const,
  },
  leads: {
    all: () => ['leads'] as const,
    list: (params?: Record<string, any>) => ['leads', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['leads', 'detail', String(id)] as const,
  },
  clients: {
    all: () => ['clients'] as const,
    list: (params?: Record<string, any>) => ['clients', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['clients', 'detail', String(id)] as const,
  },
  jobs: {
    all: () => ['jobs'] as const,
    list: (params?: Record<string, any>) => ['jobs', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['jobs', 'detail', String(id)] as const,
  },
  contracts: {
    all: () => ['contracts'] as const,
    list: (params?: Record<string, any>) => ['contracts', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['contracts', 'detail', String(id)] as const,
    pending: () => ['contracts', 'pending'] as const,
  },
  dashboard: {
    all: () => ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    activities: () => ['dashboard', 'activities'] as const,
  },
  system: {
    all: () => ['system'] as const,
    settings: () => ['system', 'settings'] as const,
    users: () => ['system', 'users'] as const,
  },
} as const;
