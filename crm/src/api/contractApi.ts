import { api, API_BASE } from '@/lib/api';
import { httpClient } from '@/shared/api/client';
import { PublicContractData, PublicSignContractPayload } from '@/types/contractStudioTypes';

export interface ContractData {
  lead_id?: number | null;
  client_id?: number | null;
  contract_id?: number | null;
  estimate_id?: number | null;
  contract_data: {
    project_address: string;
    client_name: string;
    contractor_name: string;
    contractor_title: string;
    salesperson_name: string;
    contract_date: string;
    contract_date_short: string;
    scope_title: string;
    scope_sections: Array<{ heading: string; text: string }>;
    start_date: string;
    commencement_date: string;
    completion_date: string;
    contract_price: string;
    finance_charge: string;
    downpayment: string;
    payment_schedule: Array<{ number: string; description: string; amount: string }>;
    payment_schedule_total: string;
    license_number: string;
    cancellation_deadline: string;
  };
}

export interface ContractRecord {
  id: number;
  lead_id: number | null;
  estimate_id: number | null;
  contract_number: string | null;
  status: 'draft' | 'sent' | 'signed';
  pdf_url?: string | null;
}

export interface ContractRow {
  id: number;
  contract_number: string;
  status: 'draft' | 'sent' | 'client_signed' | 'signed' | string;
  is_archived?: boolean;
  client_signed_at?: string | null;
  counter_signed_at?: string | null;
  created_at: string;
  updated_at: string;
  lead_id?: number | null;
  client_id?: number | null;
  estimate_id?: number | null;
  job_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  service_type?: string | null;
  estimated_value?: number | null;
  assigned_to?: string | null;
  pipeline_stage?: string | null;
  pdf_url?: string | null;
  signed_pdf_url?: string | null;
  client_initials?: string | null;
  signature_name?: string | null;
}

export interface ContractsSummary {
  totalCount: number;
  signedCount: number;
  clientSignedCount?: number;
  sentCount: number;
  draftCount: number;
  archivedCount?: number;
  totalValue: number;
  signedValue: number;
}

export async function getContracts(params?: { status?: string; search?: string }): Promise<{
  contracts: ContractRow[];
  summary: ContractsSummary;
}> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  const queryStr = qs.toString() ? `?${qs.toString()}` : '';
  return api.request(`/admin/contracts${queryStr}`);
}

export async function buildContract(
  data: ContractData
): Promise<{
  contract_id: number;
  contract_number: string;
  pdf_url: string;
  signing_token?: string;
  signing_url?: string;
  status: string;
}> {
  return api.request('/admin/contracts/build', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendContract(
  contractId: number,
  toEmail: string,
  customMessage?: string
): Promise<{ success: boolean; email_id?: string; error?: string; signing_url?: string }> {
  return api.request(`/admin/contracts/${contractId}/send`, {
    method: 'POST',
    body: JSON.stringify({ to_email: toEmail, custom_message: customMessage }),
  });
}

export async function sendContractSms(
  contractId: number,
  phone: string,
  customMessage?: string
): Promise<{ success: boolean; message: string; signing_url: string; phone: string }> {
  return api.request(`/admin/contracts/${contractId}/send-sms`, {
    method: 'POST',
    body: JSON.stringify({ phone, custom_message: customMessage }),
  });
}

export async function getContractsByLead(leadId: number): Promise<ContractRecord[]> {
  return api.request(`/admin/contracts/by-lead/${leadId}`);
}

export async function getContractById(contractId: number | string): Promise<{
  contract: ContractRow & { contract_data?: any; signing_token?: string };
}> {
  return api.request(`/admin/contracts/${contractId}`);
}

export async function getDraftContractByLead(leadId: number | string): Promise<{
  exists: boolean;
  contract?: (ContractRow & { contract_data?: any; signing_token?: string }) | null;
}> {
  return api.request(`/admin/contracts/draft-by-lead/${leadId}`);
}

export async function getDraftContractByClient(clientId: number | string): Promise<{
  exists: boolean;
  contract?: (ContractRow & { contract_data?: any; signing_token?: string }) | null;
}> {
  return api.request(`/admin/contracts/draft-by-client/${clientId}`);
}

export async function autoSaveContractDraft(
  contractId: number | string,
  contractData: any
): Promise<{ ok: boolean; contract_id: number }> {
  return api.request(`/admin/contracts/${contractId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({ contract_data: contractData }),
  });
}

export async function deleteContractDraft(contractId: number | string): Promise<{ ok: boolean; deleted_id: number }> {
  return api.request(`/admin/contracts/${contractId}`, {
    method: 'DELETE',
  });
}

export async function archiveContract(contractId: number | string): Promise<{ ok: boolean; is_archived: boolean }> {
  return api.request(`/admin/contracts/${contractId}/archive`, {
    method: 'PATCH',
  });
}

export async function unarchiveContract(contractId: number | string): Promise<{ ok: boolean; is_archived: boolean }> {
  return api.request(`/admin/contracts/${contractId}/unarchive`, {
    method: 'PATCH',
  });
}

export async function signContract(
  contractId: number,
  signedBy: string,
  signatureDate?: string
): Promise<ContractRecord> {
  return api.request(`/admin/contracts/${contractId}/sign`, {
    method: 'PATCH',
    body: JSON.stringify({ signed_by: signedBy, signature_date: signatureDate }),
  });
}

export async function counterSignContract(
  contractId: number,
  options?: {
    contractorName?: string;
    contractorTitle?: string;
    signatoryId?: number;
    signatureData?: string;
    signatureType?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  contract: ContractRow;
  pdf_url: string;
  email_sent: boolean;
  sms_sent: boolean;
  customer_phone?: string;
  download_url?: string;
  status: string;
}> {
  return api.request(`/admin/contracts/${contractId}/counter-sign`, {
    method: 'POST',
    body: JSON.stringify({
      contractor_name: options?.contractorName,
      contractor_title: options?.contractorTitle,
      signatory_id: options?.signatoryId,
      signature_data: options?.signatureData,
      signature_type: options?.signatureType,
    }),
  });
}

/** Public homeowner contract endpoints (no auth required) */
export async function getPublicContract(token: string): Promise<{ contract: PublicContractData }> {
  return await httpClient.get<{ contract: PublicContractData }>(`/contract/${encodeURIComponent(token)}`);
}

export async function signPublicContract(
  token: string,
  payload: PublicSignContractPayload
): Promise<{ success: boolean; message: string; signed_pdf_url: string; signed_at: string }> {
  return await httpClient.post<{ success: boolean; message: string; signed_pdf_url: string; signed_at: string }>(
    `/contract/${encodeURIComponent(token)}/sign`,
    payload
  );
}

/** Returns the URL to preview/download the contract PDF in a new tab. */
export function previewContractUrl(contractId: number): string {
  return `${API_BASE}/admin/contracts/${contractId}/preview`;
}
