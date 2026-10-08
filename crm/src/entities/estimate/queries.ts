import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';

export interface EstimateSummary {
  totalCount: number;
  pipelineValue: number;
  acceptedCount: number;
  acceptedValue: number;
  draftCount?: number;
  sentCount?: number;
  archivedCount?: number;
}

export interface EstimateRow {
  id: number;
  estimate_number: string;
  status: string;
  is_archived?: boolean;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  total?: number;
  template_key?: string;
  pdf_url?: string;
  created_at: string;
  sent_at?: string;
  lead_id?: number;
  client_id?: number;
}

export interface EstimatesListResponse {
  estimates: EstimateRow[];
  summary: EstimateSummary;
}

export function useEstimatesListQuery(
  statusFilter?: string,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<EstimatesListResponse>({
    queryKey: queryKeys.estimates.list(statusFilter ? { status: statusFilter } : undefined),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await api.request(`/admin/estimates${queryStr}`);
      return {
        estimates: (res as any).estimates || [],
        summary: (res as any).summary || {
          totalCount: 0,
          pipelineValue: 0,
          acceptedCount: 0,
          acceptedValue: 0,
        },
      };
    },
    staleTime: 60_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled,
  });
}
