import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchClients, fetchClient360, checkClientContact } from '@/api/clientsApi';

export interface UseClientsListParams {
  search?: string;
  category?: string;
  status?: string;
  tag?: string;
  sort?: string;
  page?: number;
  sync?: boolean;
}

export function useClientsListQuery(
  params?: UseClientsListParams,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: queryKeys.clients.list(params as Record<string, unknown> | undefined),
    queryFn: () => fetchClients(params),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}

export function useClientDetailQuery(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => fetchClient360(id),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(id),
    staleTime: 30_000,
  });
}

export function useClient360Query(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.clients.profile360(id),
    queryFn: () => fetchClient360(id),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(id),
    staleTime: 15_000,
  });
}

export function useCheckClientContactQuery(params: {
  email?: string;
  phone?: string;
  excludeClientId?: number;
}) {
  return useQuery({
    queryKey: ['clients', 'check-contact', params] as const,
    queryFn: () => checkClientContact(params),
    enabled: Boolean(
      (params.email && params.email.includes('@')) ||
        (params.phone && params.phone.replace(/\D/g, '').length >= 7)
    ),
    staleTime: 5_000,
  });
}
