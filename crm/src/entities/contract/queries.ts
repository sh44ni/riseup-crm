import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getContracts, getContractsByLead, getDraftContractByLead } from '@/api/contractApi';

export interface UseContractsListParams {
  status?: string;
  search?: string;
}

export function useContractsListQuery(
  params?: UseContractsListParams,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: queryKeys.contracts.list(params as Record<string, unknown> | undefined),
    queryFn: () => getContracts(params),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}

export function useContractsByLeadQuery(leadId: number | string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['contracts', 'by-lead', String(leadId)] as const,
    queryFn: () => getContractsByLead(Number(leadId)),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(leadId),
    staleTime: 15_000,
  });
}

export function useDraftContractByLeadQuery(leadId: number | string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['contracts', 'draft-by-lead', String(leadId)] as const,
    queryFn: () => getDraftContractByLead(leadId),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(leadId),
    staleTime: 15_000,
  });
}
