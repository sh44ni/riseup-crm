import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { backendClientToClient360 } from '@/lib/clientAdapter';
import { Client360Record } from '@/types/client360Types';
import { queryKeys } from '@/lib/queryKeys';

export function useClients360() {
  const { data: clients = [], refetch } = useQuery<Client360Record[]>({
    queryKey: queryKeys.clients.list(),
    queryFn: async () => {
      const res = await api.request<{ clients: any[] }>('/admin/clients');
      return (res.clients || []).map((c: any) => backendClientToClient360(c));
    },
  });

  return { clients, refresh: refetch };
}
