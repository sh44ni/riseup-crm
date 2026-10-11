/** Shared helpers for the Company Signature settings UI. */

export const COMPANY_LEGAL_NAME = 'Rise Up Roofing and Construction, Inc.';
export const CONTRACTOR_LICENSE_LABEL = 'Lic #1096492 (B/C39/C46)';
export const DEFAULT_SIGNER_NAME = 'Edith Guerrero';

export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 500;

const CHANGED_FIELD_LABELS: Record<string, string> = {
  signature_data: 'Signature',
  signer_name: 'Name',
  signer_title: 'Title',
  signature_type: 'Style',
};

export function changedFieldLabel(field: string): string {
  return CHANGED_FIELD_LABELS[field] || field.replace(/_/g, ' ');
}

export function formatSignatureDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatSignatureDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
