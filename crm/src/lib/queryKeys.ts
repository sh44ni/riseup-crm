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
    deals: (params?: Record<string, unknown>) => ['pipeline', 'deals', params ?? {}] as const,
    analytics: () => ['pipeline', 'analytics'] as const,
    summary: () => ['pipeline', 'summary'] as const,
    kanban: () => ['pipeline', 'kanban'] as const,
  },
  leads: {
    all: () => ['leads'] as const,
    list: (params?: Record<string, unknown>) => ['leads', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['leads', 'detail', String(id)] as const,
    activities: (id: string | number) => ['leads', 'activities', String(id)] as const,
  },
  clients: {
    all: () => ['clients'] as const,
    list: (params?: Record<string, unknown>) => ['clients', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['clients', 'detail', String(id)] as const,
    profile360: (id: string | number) => ['clients', 'profile360', String(id)] as const,
  },
  jobs: {
    all: () => ['jobs'] as const,
    list: (params?: Record<string, unknown>) => ['jobs', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['jobs', 'detail', String(id)] as const,
    activities: (id: string | number) => ['jobs', 'activities', String(id)] as const,
  },
  estimates: {
    all: () => ['estimates'] as const,
    list: (params?: Record<string, unknown>) => ['estimates', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['estimates', 'detail', String(id)] as const,
  },
  contracts: {
    all: () => ['contracts'] as const,
    list: (params?: Record<string, unknown>) => ['contracts', 'list', params ?? {}] as const,
    detail: (id: string | number) => ['contracts', 'detail', String(id)] as const,
    pending: () => ['contracts', 'pending'] as const,
  },
  tasks: {
    all: () => ['tasks'] as const,
    list: (params?: Record<string, unknown>) => ['tasks', 'list', params ?? {}] as const,
    personal: () => ['tasks', 'personal'] as const,
  },
  calendar: {
    all: () => ['calendar'] as const,
    events: (params?: Record<string, unknown>) => ['calendar', 'events', params ?? {}] as const,
  },
  dashboard: {
    all: () => ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    activities: () => ['dashboard', 'activities'] as const,
  },
  reports: {
    all: () => ['reports'] as const,
    overview: (params?: Record<string, unknown>) => ['reports', 'overview', params ?? {}] as const,
  },
  system: {
    all: () => ['system'] as const,
    settings: () => ['system', 'settings'] as const,
    users: () => ['system', 'users'] as const,
    roles: () => ['system', 'roles'] as const,
    preferences: () => ['system', 'preferences'] as const,
  },
} as const;

export default queryKeys;
