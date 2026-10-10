// Rise Up CRM — Client Invoices & Payments API
// Handles invoice creation, PDF generation, email sending, and payment tracking

import { httpClient } from '@/shared/api/client';
import { InvoiceLineItem, InvoicePaymentRecord, ClientInvoice } from '@/types/client360Types';

export interface CreateInvoicePayload {
  clientId?: number;
  jobId?: number | null;
  estimateId?: number | null;
  invoiceNumber?: string;
  milestoneName?: string;
  amount?: number;
  dueDate?: string;
  paymentTerms?: string;
  lineItems?: InvoiceLineItem[];
  notes?: string;
  status?: string;
  taxRate?: number;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
  depositAmount?: number;
  acceptedMethods?: { type: string; name?: string; fields: { label: string; value: string }[] }[];
  paymentInstructions?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  paymentDate?: string;
}

export interface SendInvoicePayload {
  customerEmail?: string;
  customerName?: string;
  customMessage?: string;
}

export interface InvoiceDetailResponse {
  ok: boolean;
  invoice: any;
}

export interface RenderPdfResponse {
  ok: boolean;
  pdfUrl: string;
  url: string;
  filename: string;
}

export interface SendInvoiceResponse {
  ok: boolean;
  message: string;
  emailResult?: any;
  pdfUrl?: string;
}

export async function createClientInvoice(
  clientId: string | number,
  payload: CreateInvoicePayload
): Promise<{ ok: boolean; invoice: any }> {
  return httpClient.post<{ ok: boolean; invoice: any }>(
    `/api/admin/clients/${clientId}/invoices`,
    payload
  );
}

export async function getClientInvoices(
  clientId: string | number
): Promise<{ ok: boolean; invoices: any[] }> {
  return httpClient.get<{ ok: boolean; invoices: any[] }>(
    `/api/admin/clients/${clientId}/invoices`
  );
}

export async function getInvoice(
  invoiceId: string | number
): Promise<InvoiceDetailResponse> {
  return httpClient.get<InvoiceDetailResponse>(
    `/api/admin/invoices/${invoiceId}`
  );
}

export async function renderInvoicePdf(
  invoiceId: string | number
): Promise<RenderPdfResponse> {
  return httpClient.get<RenderPdfResponse>(
    `/api/admin/invoices/${invoiceId}/render-pdf`
  );
}

export async function sendInvoiceEmail(
  invoiceId: string | number,
  payload?: SendInvoicePayload
): Promise<SendInvoiceResponse> {
  return httpClient.post<SendInvoiceResponse>(
    `/api/admin/invoices/${invoiceId}/send`,
    payload || {}
  );
}

export async function recordInvoicePayment(
  invoiceId: string | number,
  payload: RecordPaymentPayload
): Promise<{ ok: boolean; message: string; invoice: any; payment: any }> {
  return httpClient.post<{ ok: boolean; message: string; invoice: any; payment: any }>(
    `/api/admin/invoices/${invoiceId}/payments`,
    payload
  );
}

export async function deleteInvoice(
  invoiceId: string | number
): Promise<{ ok: boolean; message: string }> {
  return httpClient.delete<{ ok: boolean; message: string }>(
    `/api/admin/invoices/${invoiceId}`
  );
}
