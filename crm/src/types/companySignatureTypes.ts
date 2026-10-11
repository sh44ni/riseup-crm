import type { SignatureAccess } from '@/lib/signatureAccess';

export type CompanySignatureType = 'typed' | 'drawn';

/** GET /admin/company-signature/status — available to any signed-in user (no image). */
export interface CompanySignatureStatus {
  configured: boolean;
  signer_name: string | null;
  signer_title: string | null;
  version: number | null;
  updated_at: string | null;
}

/** Current company signature (includes the image / typed text). */
export interface CompanySignature {
  version: number;
  signer_name: string;
  signer_title: string;
  signature_type: CompanySignatureType;
  signature_data: string;
  configured_at: string | null;
  configured_by_name: string | null;
  updated_at: string | null;
  updated_by_name: string | null;
}

/** GET /admin/company-signature — requires `view`. */
export interface CompanySignatureResponse {
  configured: boolean;
  access: SignatureAccess;
  signature: CompanySignature | null;
}

export type CompanySignatureAction = 'configured' | 'updated';

/** One row of GET /admin/company-signature/history (no image). */
export interface CompanySignatureHistoryEntry {
  id: number;
  version: number;
  action: CompanySignatureAction;
  signer_name: string;
  signer_title: string;
  signature_type: CompanySignatureType;
  reason: string | null;
  changed_fields: string[] | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  created_at: string;
}

/** GET /admin/company-signature/history/{version} — includes signature_data. */
export interface CompanySignatureVersionDetail extends CompanySignatureHistoryEntry {
  signature_data: string;
}

export interface CompanySignatureHistoryResponse {
  history: CompanySignatureHistoryEntry[];
}

/** PUT /admin/company-signature body — requires `edit`. */
export interface CompanySignatureUpdatePayload {
  signer_name: string;
  signer_title: string;
  signature_type: CompanySignatureType;
  signature_data: string;
  reason?: string;
  expected_version?: number | null;
}
