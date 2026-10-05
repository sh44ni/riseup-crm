import { Client360Record, ClientSortConfig, ClientSortField, SortDirection } from '@/types/client360Types';

export interface ClientSortOption {
  id: ClientSortField;
  label: string;
  ascLabel: string;
  descLabel: string;
}

export const CLIENT_SORT_OPTIONS: ClientSortOption[] = [
  { id: 'name', label: 'Homeowner Name', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { id: 'status', label: 'Status / Stage', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { id: 'assignedRep', label: 'Assigned Rep', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { id: 'createdAt', label: 'Recently Added', ascLabel: 'Oldest First', descLabel: 'Newest First' },
  { id: 'revenue', label: 'Project Value ($)', ascLabel: 'Lowest First', descLabel: 'Highest First' },
  { id: 'city', label: 'City / Location', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { id: 'roofArea', label: 'Roof Area (Sq Ft)', ascLabel: 'Smallest First', descLabel: 'Largest First' },
];

export const DEFAULT_CLIENT_SORT: ClientSortConfig = {
  field: 'name',
  direction: 'asc',
};

/**
 * Extracts a numeric project or contract value from a Client360Record
 */
export function getClientProjectValue(client: Client360Record): number {
  return (
    client.activeJob?.contractValue ||
    client.completedJob?.totalPaid ||
    client.billingSummary?.totalBilled ||
    client.totalRevenue ||
    client.quotes?.[0]?.amount ||
    0
  );
}

/**
 * Parses timestamp or falls back to client ID
 */
function getClientTimestamp(client: Client360Record): number {
  if (client.createdAt) {
    const t = new Date(client.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  const idNum = parseInt(client.id.replace(/\D/g, ''), 10);
  return !isNaN(idNum) ? idNum : 0;
}

/**
 * Pure sorting function for Client360Record arrays
 */
export function sortClients(
  clients: Client360Record[],
  config: ClientSortConfig
): Client360Record[] {
  const { field, direction } = config;
  const multiplier = direction === 'desc' ? -1 : 1;

  return [...clients].sort((a, b) => {
    let diff = 0;

    switch (field) {
      case 'name':
        diff = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        break;

      case 'status': {
        const labelA = a.statusLabel || a.status || '';
        const labelB = b.statusLabel || b.status || '';
        diff = labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
        break;
      }

      case 'assignedRep': {
        const repA = a.assignedRep?.name || '';
        const repB = b.assignedRep?.name || '';
        diff = repA.localeCompare(repB, undefined, { sensitivity: 'base' });
        break;
      }

      case 'createdAt': {
        const timeA = getClientTimestamp(a);
        const timeB = getClientTimestamp(b);
        diff = timeA - timeB;
        break;
      }

      case 'revenue': {
        const valA = getClientProjectValue(a);
        const valB = getClientProjectValue(b);
        diff = valA - valB;
        break;
      }

      case 'city': {
        const cityA = a.city || a.roofSpecs?.cityZip || '';
        const cityB = b.city || b.roofSpecs?.cityZip || '';
        diff = cityA.localeCompare(cityB, undefined, { sensitivity: 'base' });
        break;
      }

      case 'roofArea': {
        const areaA = a.roofSpecs?.roofAreaSqFt || 0;
        const areaB = b.roofSpecs?.roofAreaSqFt || 0;
        diff = areaA - areaB;
        break;
      }

      default:
        diff = 0;
    }

    if (diff !== 0) {
      return diff * multiplier;
    }

    // Secondary tiebreaker: stable id sort
    return a.id.localeCompare(b.id);
  });
}

/**
 * Storage key scoped per user to remember each user's selection
 */
export function getClientSortStorageKey(userId?: string | number | null): string {
  if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
    return `riseup_clients_sort_user_${userId}`;
  }
  return 'riseup_clients_sort_guest';
}

/**
 * Retrieves the persisted sort configuration for the current user
 */
export function getSavedClientSort(userId?: string | number | null): ClientSortConfig {
  const key = getClientSortStorageKey(userId);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isValidField = CLIENT_SORT_OPTIONS.some((o) => o.id === parsed.field);
        const isValidDirection = parsed.direction === 'asc' || parsed.direction === 'desc';
        if (isValidField && isValidDirection) {
          return {
            field: parsed.field as ClientSortField,
            direction: parsed.direction as SortDirection,
          };
        }
      }
    }
  } catch {
    // Ignore localStorage parse errors or disabled cookies
  }
  return DEFAULT_CLIENT_SORT;
}

/**
 * Persists the sort configuration for the current user
 */
export function saveClientSort(
  config: ClientSortConfig,
  userId?: string | number | null
): void {
  const key = getClientSortStorageKey(userId);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(config));
    }
  } catch {
    // Ignore quota or private-browsing errors
  }
}
