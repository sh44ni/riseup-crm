import {
  type ContractStudioData,
  DEFAULT_LICENSING_CLAUSE,
  DEFAULT_CHANGE_ORDER_CLAUSE,
  DEFAULT_PAYMENT_TERMS_TEXT,
  DEFAULT_REFUND_POLICY_TEXT,
  DEFAULT_LIABILITY_INSURANCE_TEXT,
  DEFAULT_WORKERS_COMP_TEXT,
  DEFAULT_MECHANICS_LIEN_WARNING_TEXT,
  DEFAULT_CSLB_DISCLOSURE_TEXT,
  DEFAULT_REPRESENTATIONS_TEXT,
  DEFAULT_GENERAL_PROVISIONS_TEXT,
  DEFAULT_TERM_TERMINATION_TEXT,
  DEFAULT_BOND_TEXT,
  DEFAULT_THREE_DAY_NOTICE_TEXT,
  DEFAULT_FIVE_DAY_NOTICE_TEXT,
  DEFAULT_JOBSITE_STANDARDS_TEXT,
  DEFAULT_DECKING_ALLOWANCE_TEXT,
} from '@/types/contractStudioTypes';
import { CONTRACT_CSS } from './html/contractStyles';
import type { ContractRenderContext } from './html/types';
import { renderPage1, renderPage2, renderPage3 } from './html/contractPages1To3';
import { renderPage4, renderPage5, renderPage6, renderPage7 } from './html/contractPages4To7';

export class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractValidationError';
  }
}

export function validateContractData(data: Partial<ContractStudioData>): void {
  if (!data || typeof data !== 'object') {
    throw new ContractValidationError('Contract data payload is required');
  }

  const missing: string[] = [];
  if (!data.clientName?.trim()) missing.push('clientName');
  if (!data.projectAddress?.trim()) missing.push('projectAddress');
  if (!data.contractorName?.trim()) missing.push('contractorName');
  if (!data.contractorLicense?.trim()) missing.push('contractorLicense');
  if (!data.contractDate?.trim()) missing.push('contractDate');
  if (!data.scopeTitle?.trim()) missing.push('scopeTitle');
  if (
    data.contractPrice === undefined ||
    data.contractPrice === null ||
    typeof data.contractPrice !== 'number' ||
    isNaN(data.contractPrice) ||
    data.contractPrice <= 0
  ) {
    missing.push('contractPrice');
  }
  if (!Array.isArray(data.scopeSections) || data.scopeSections.length === 0) {
    missing.push('scopeSections');
  }
  if (!Array.isArray(data.paymentSchedule) || data.paymentSchedule.length === 0) {
    missing.push('paymentSchedule');
  }

  if (missing.length > 0) {
    throw new ContractValidationError(
      `Contract validation failed: missing required field(s): ${missing.join(', ')}`
    );
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export function generateContractHtml(data: ContractStudioData, page: number | 'all' = 1): string {
  // Enforce strict validation: missing required contract fields are an error, never a demo default
  validateContractData(data);

  const rawSig = data.clientSignatureData || '';
  const clientSignatureData =
    typeof rawSig === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(rawSig)
      ? rawSig
      : '';

  const isClientSigned = Boolean(
    data.isSigned ||
    data.signedAt ||
    data.client_signed_at ||
    data.clientSignatureName ||
    data.clientSignatureData ||
    data.status === 'client_signed' ||
    data.status === 'signed'
  );

  const isCounterSigned = Boolean(
    data.isCounterSigned ||
    data.is_counter_signed ||
    data.counterSignedAt ||
    data.counter_signed_at ||
    (data.status === 'signed' && (data.counterSignedAt || data.counter_signed_at))
  );

  let executionStatusLabel = 'DRAFT';
  let executionStatusSlug = 'draft';
  if (isClientSigned && isCounterSigned) {
    executionStatusLabel = 'FULLY EXECUTED';
    executionStatusSlug = 'fully-executed';
  } else if (isClientSigned) {
    executionStatusLabel = 'PARTIALLY EXECUTED';
    executionStatusSlug = 'partially-executed';
  }

  const rawContractorSig = data.contractorSignatureData || data.contractor_signature_data || '';
  const contractorSignatureData =
    typeof rawContractorSig === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(rawContractorSig)
      ? rawContractorSig
      : '';

  const rawAddr = (data.projectAddress || '').trim();
  const rawCity = (data.city || '').trim();
  const rawState = (data.state || 'CA').trim();
  const rawZip = (data.zip || '').trim();

  let formattedAddr = rawAddr;
  if (rawCity && !formattedAddr.toLowerCase().includes(rawCity.toLowerCase())) {
    formattedAddr += `, ${rawCity}`;
  }
  if (rawState && !formattedAddr.includes(rawState)) {
    formattedAddr += `, ${rawState}`;
  }
  if (rawZip && !formattedAddr.includes(rawZip)) {
    formattedAddr += ` ${rawZip}`;
  }

  const ctx: ContractRenderContext = {
    clientName: escapeHtml(data.clientName),
    clientInitials: data.clientInitials ? escapeHtml(data.clientInitials) : '',
    isSigned: Boolean(data.isSigned),
    clientSignatureName: escapeHtml(data.clientSignatureName || ''),
    clientSignatureData,
    isClientSigned,
    isCounterSigned,
    executionStatusLabel,
    executionStatusSlug,
    contractorSignatureName: escapeHtml(data.contractorSignatureName || ''),
    contractorSignatureData,
    contractorSignatureTitle: escapeHtml(data.contractorTitle || 'Project Manager'),
    contractorSignatoryName: escapeHtml(
      data.contractorSignatoryName || (isCounterSigned ? data.contractorSignatureName || '' : '')
    ),
    contractorSignatoryTitle: escapeHtml(
      data.contractorSignatoryTitle || (isCounterSigned ? data.contractorTitle || '' : '')
    ),
    projectAddress: escapeHtml(formattedAddr),
    contractDate: escapeHtml(data.contractDate),
    contractDateShort: escapeHtml(data.contractDateShort || data.contractDate),
    salespersonName: escapeHtml(data.salespersonName || ''),
    contractorName: escapeHtml(data.contractorName),
    contractorLicense: escapeHtml(data.contractorLicense),

    // Cover Page
    contractTitle: escapeHtml(data.contractTitle || 'HOME IMPROVEMENT CONTRACT'),
    propertyPhotoUrl: data.propertyPhotoUrl || '',
    preparedByName: escapeHtml(data.preparedByName || data.salespersonName || 'Rise Up Representative'),
    preparedByTitle: escapeHtml(data.preparedByTitle || 'Project Manager'),

    // Scope & Dates
    scopeTitle: escapeHtml(data.scopeTitle),
    scopeIntro: escapeHtml(data.scopeIntro || ''),
    scopeSections: data.scopeSections || [],
    contractPrice: fmt(data.contractPrice),
    downpayment: fmt(data.downpayment || 0),
    financeCharge: escapeHtml(data.financeCharge || '0.00'),
    approxStartDate: escapeHtml(data.approxStartDate || 'TBD'),
    substantialCommencementDate: escapeHtml(data.substantialCommencementDate || 'TBD'),
    approxCompletionDate: escapeHtml(data.approxCompletionDate || 'TBD'),
    cancellationEmail: escapeHtml(data.cancellationEmail || 'accountant@riseuprac.com'),
    insuranceCarrier: escapeHtml(data.insuranceCarrier || 'PACIFIC UNITED INSURANCE SERVICES'),
    insurancePhone: escapeHtml(data.insurancePhone || '(619) 274-8144'),
    workersCompCarrier: escapeHtml(data.workersCompCarrier || 'PACIFIC UNITED INSURANCE SERVICES'),
    workersCompPhone: escapeHtml(data.workersCompPhone || '(619) 274-8144'),
    paymentRows: (data.paymentSchedule || []).map((p) => ({
      number: p.number,
      description: p.description,
      amount: typeof p.amount === 'number' ? p.amount : Number(p.amount) || 0,
    })),

    // Rule 11 Editable Legal Clauses (with standard defaults)
    licensingClause: escapeHtml(data.licensingClause || DEFAULT_LICENSING_CLAUSE),
    changeOrderClause: escapeHtml(data.changeOrderClause || DEFAULT_CHANGE_ORDER_CLAUSE),
    paymentTermsText: escapeHtml(data.paymentTermsText || DEFAULT_PAYMENT_TERMS_TEXT),
    refundPolicyText: escapeHtml(data.refundPolicyText || DEFAULT_REFUND_POLICY_TEXT),
    liabilityInsuranceText: escapeHtml(data.liabilityInsuranceText || DEFAULT_LIABILITY_INSURANCE_TEXT),
    workersCompText: escapeHtml(data.workersCompText || DEFAULT_WORKERS_COMP_TEXT),
    mechanicsLienWarningText: escapeHtml(data.mechanicsLienWarningText || DEFAULT_MECHANICS_LIEN_WARNING_TEXT),
    cslbDisclosureText: escapeHtml(data.cslbDisclosureText || DEFAULT_CSLB_DISCLOSURE_TEXT),
    representationsText: escapeHtml(data.representationsText || DEFAULT_REPRESENTATIONS_TEXT),
    generalProvisionsText: escapeHtml(data.generalProvisionsText || DEFAULT_GENERAL_PROVISIONS_TEXT),
    termTerminationText: escapeHtml(data.termTerminationText || DEFAULT_TERM_TERMINATION_TEXT),
    bondText: escapeHtml(data.bondText || DEFAULT_BOND_TEXT),
    threeDayNoticeText: escapeHtml(data.threeDayNoticeText || DEFAULT_THREE_DAY_NOTICE_TEXT),
    fiveDayNoticeText: escapeHtml(data.fiveDayNoticeText || DEFAULT_FIVE_DAY_NOTICE_TEXT),
    jobsiteStandardsText: escapeHtml(data.jobsiteStandardsText || DEFAULT_JOBSITE_STANDARDS_TEXT),
    deckingAllowanceText: escapeHtml(data.deckingAllowanceText || DEFAULT_DECKING_ALLOWANCE_TEXT),

    signedAt: data.signedAt || data.client_signed_at,
    counterSignedAt: data.counterSignedAt || data.counter_signed_at,
    fmt,
    escapeHtml,
  };

  let bodyContent = '';
  if (page === 1) bodyContent = renderPage1(ctx);
  else if (page === 2) bodyContent = renderPage2(ctx);
  else if (page === 3) bodyContent = renderPage3(ctx);
  else if (page === 4) bodyContent = renderPage4(ctx);
  else if (page === 5) bodyContent = renderPage5(ctx);
  else if (page === 6) bodyContent = renderPage6(ctx);
  else if (page === 7) bodyContent = renderPage7(ctx);
  else {
    bodyContent =
      renderPage1(ctx) +
      renderPage2(ctx) +
      renderPage3(ctx) +
      renderPage4(ctx) +
      renderPage5(ctx) +
      renderPage6(ctx) +
      renderPage7(ctx);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${ctx.contractTitle} &bull; Rise Up Roofing and Construction, Inc.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,800;0,900;1,800;1,900&family=Source+Serif+4:wght@400;600&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
${CONTRACT_CSS}
</style>
</head>
<body>
<div id="doc">
${bodyContent}
</div>
</body>
</html>`;
}
