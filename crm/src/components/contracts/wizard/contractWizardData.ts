import type {
  ContractStudioData,
  ContractScopeSection,
  ContractPaymentRow,
} from '@/types/contractStudioTypes';
import {
  DEFAULT_CONTRACT_SECTIONS,
  DEFAULT_CONTRACT_PAYMENTS,
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
import { parseMoney } from '@/shared/lib/money';

export interface WizardPrefill {
  leadId?: string;
  clientId?: string;
  clientName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  service?: string;
  value?: number;
}

export interface ClientValidationResult {
  isValid: boolean;
  missingFields: string[];
  errorMessage?: string;
}

export function validateClientProfileForContract(client: {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}): ClientValidationResult {
  const missing: string[] = [];
  if (!client.address || !client.address.trim()) missing.push('address');
  if (!client.phone || !client.phone.trim()) missing.push('phone number');
  if (!client.email || !client.email.trim()) missing.push('email');

  if (missing.length > 0) {
    return {
      isValid: false,
      missingFields: missing,
      errorMessage: `Please add the ${missing.join(', ')} via Client 360 before generating a contract.`,
    };
  }

  return { isValid: true, missingFields: [] };
}

export const DEFAULT_CONTRACT: ContractStudioData = {
  status: 'draft',
  contractTitle: 'HOME IMPROVEMENT CONTRACT',
  propertyPhotoUrl: '',
  preparedByName: '',
  preparedByTitle: 'Project Manager',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  projectAddress: '',
  city: '',
  state: 'CA',
  zip: '',
  contractorName: 'Rise Up Roofing and Construction, Inc.',
  contractorTitle: 'Licensed General Contractor',
  contractorLicense: '1096492',
  salespersonName: '',
  contractDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  contractDateShort: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  approxStartDate: 'Within 2–3 weeks of permit issuance',
  substantialCommencementDate: 'Within 3 days of material delivery',
  approxCompletionDate: '5–7 business days from commencement',
  scopeTitle: 'Complete Roofing System Installation',
  scopeIntro:
    'Rise Up Roofing & Construction, Inc. agrees to furnish all materials, equipment, and labor for the full project scope:',
  scopeSections: DEFAULT_CONTRACT_SECTIONS,
  contractPrice: 0,
  downpayment: 0,
  financeCharge: '0.00',
  paymentSchedule: DEFAULT_CONTRACT_PAYMENTS,
  cancellationDeadlineDays: 3,
  cancellationEmail: 'accountant@riseuprac.com',
  insuranceCarrier: 'PACIFIC UNITED INSURANCE SERVICES',
  insurancePhone: '(619) 274-8144',
  workersCompCarrier: 'PACIFIC UNITED INSURANCE SERVICES',
  workersCompPhone: '(619) 274-8144',
  licensingClause: DEFAULT_LICENSING_CLAUSE,
  changeOrderClause: DEFAULT_CHANGE_ORDER_CLAUSE,
  paymentTermsText: DEFAULT_PAYMENT_TERMS_TEXT,
  refundPolicyText: DEFAULT_REFUND_POLICY_TEXT,
  liabilityInsuranceText: DEFAULT_LIABILITY_INSURANCE_TEXT,
  workersCompText: DEFAULT_WORKERS_COMP_TEXT,
  mechanicsLienWarningText: DEFAULT_MECHANICS_LIEN_WARNING_TEXT,
  cslbDisclosureText: DEFAULT_CSLB_DISCLOSURE_TEXT,
  representationsText: DEFAULT_REPRESENTATIONS_TEXT,
  generalProvisionsText: DEFAULT_GENERAL_PROVISIONS_TEXT,
  termTerminationText: DEFAULT_TERM_TERMINATION_TEXT,
  bondText: DEFAULT_BOND_TEXT,
  threeDayNoticeText: DEFAULT_THREE_DAY_NOTICE_TEXT,
  fiveDayNoticeText: DEFAULT_FIVE_DAY_NOTICE_TEXT,
  jobsiteStandardsText: DEFAULT_JOBSITE_STANDARDS_TEXT,
  deckingAllowanceText: DEFAULT_DECKING_ALLOWANCE_TEXT,
  isSigned: false,
  clientInitials: '',
  clientSignatureName: '',
  contractorSignatureName: '',
};

export function cleanAddressString(addr: string): string {
  if (!addr) return '';
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (seen.has(lower)) continue;
    if (lower === 'ca' && deduped.some((d) => /\bca\b/i.test(d))) continue;
    seen.add(lower);
    deduped.push(part);
  }
  return deduped.join(', ');
}

export function parsePrice(strOrNum: unknown, defaultVal = 0): number {
  if (typeof strOrNum === 'number') return isNaN(strOrNum) ? defaultVal : strOrNum;
  if (!strOrNum) return defaultVal;
  return parseMoney(String(strOrNum)) || defaultVal;
}

export function getContractDataPayload(data: ContractStudioData, stepOverride?: number) {
  const rawAddr = (data.projectAddress || '').trim();
  const rawCity = (data.city || '').trim();
  const rawState = (data.state || 'CA').trim();
  const rawZip = (data.zip || '').trim();

  let projectAddress = '';
  if (rawAddr) {
    projectAddress = rawAddr;
    if (rawCity && !projectAddress.toLowerCase().includes(rawCity.toLowerCase())) {
      projectAddress += `, ${rawCity}`;
    }
    if (rawState && !new RegExp(`\\b${rawState}\\b`, 'i').test(projectAddress)) {
      projectAddress += `, ${rawState}`;
    }
    if (rawZip && !projectAddress.includes(rawZip)) {
      projectAddress += ` ${rawZip}`;
    }
  } else if (rawCity || rawZip) {
    projectAddress = [rawCity, rawState, rawZip].filter(Boolean).join(' ');
  }
  projectAddress = cleanAddressString(projectAddress);

  const price = data.contractPrice || 0;
  const downpayment = data.downpayment || 0;

  return {
    project_address: projectAddress,
    client_name: data.clientName || '',
    contract_title: data.contractTitle || 'HOME IMPROVEMENT CONTRACT',
    property_photo_url: data.propertyPhotoUrl || '',
    prepared_by_name: data.preparedByName || '',
    prepared_by_title: data.preparedByTitle || 'Project Manager',
    contractor_name: data.contractorName || 'Rise Up Roofing and Construction, Inc.',
    contractor_title: data.contractorTitle || 'Licensed General Contractor',
    salesperson_name: data.salespersonName || '',
    contract_date: data.contractDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    contract_date_short: data.contractDateShort || '',
    scope_title: data.scopeTitle || 'Complete Roofing System Installation',
    scope_intro: data.scopeIntro || 'Rise Up Roofing & Construction, Inc. agrees to furnish all materials, equipment, and labor for the full project scope:',
    scope_sections: (data.scopeSections || []).map((s) => ({ heading: s.heading, text: s.text })),
    start_date: data.approxStartDate || 'Within 2–3 weeks of permit issuance',
    commencement_date: data.substantialCommencementDate || 'Within 3 days of material delivery',
    completion_date: data.approxCompletionDate || '5–7 business days from commencement',
    contract_price: `$${price.toLocaleString()}`,
    finance_charge: data.financeCharge || '0.00',
    downpayment: `$${downpayment.toLocaleString()}`,
    payment_schedule: (data.paymentSchedule || []).map((p) => ({
      number: p.number,
      description: p.description,
      amount: `$${(Number(p.amount) || 0).toLocaleString()}`,
    })),
    payment_schedule_total: `$${price.toLocaleString()}`,
    license_number: data.contractorLicense || '1096492',
    cancellation_deadline: 'three business days from signing',
    client_initials: data.clientInitials || '',
    insurance_carrier: data.insuranceCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
    insurance_phone: data.insurancePhone || '(619) 274-8144',
    workers_comp_carrier: data.workersCompCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
    cancellation_email: data.cancellationEmail || 'accountant@riseuprac.com',
    licensing_clause: data.licensingClause || DEFAULT_LICENSING_CLAUSE,
    change_order_clause: data.changeOrderClause || DEFAULT_CHANGE_ORDER_CLAUSE,
    payment_terms_text: data.paymentTermsText || DEFAULT_PAYMENT_TERMS_TEXT,
    refund_policy_text: data.refundPolicyText || DEFAULT_REFUND_POLICY_TEXT,
    liability_insurance_text: data.liabilityInsuranceText || DEFAULT_LIABILITY_INSURANCE_TEXT,
    workers_comp_text: data.workersCompText || DEFAULT_WORKERS_COMP_TEXT,
    mechanics_lien_warning_text: data.mechanicsLienWarningText || DEFAULT_MECHANICS_LIEN_WARNING_TEXT,
    cslb_disclosure_text: data.cslbDisclosureText || DEFAULT_CSLB_DISCLOSURE_TEXT,
    representations_text: data.representationsText || DEFAULT_REPRESENTATIONS_TEXT,
    general_provisions_text: data.generalProvisionsText || DEFAULT_GENERAL_PROVISIONS_TEXT,
    term_termination_text: data.termTerminationText || DEFAULT_TERM_TERMINATION_TEXT,
    bond_text: data.bondText || DEFAULT_BOND_TEXT,
    three_day_notice_text: data.threeDayNoticeText || DEFAULT_THREE_DAY_NOTICE_TEXT,
    five_day_notice_text: data.fiveDayNoticeText || DEFAULT_FIVE_DAY_NOTICE_TEXT,
    jobsite_standards_text: data.jobsiteStandardsText || DEFAULT_JOBSITE_STANDARDS_TEXT,
    decking_allowance_text: data.deckingAllowanceText || DEFAULT_DECKING_ALLOWANCE_TEXT,
    // Company contractor signatory (server re-stamps these from the current company signature).
    contractor_signatory_name: data.contractorSignatoryName || '',
    contractor_signatory_title: data.contractorSignatoryTitle || '',
    wizard_step: stepOverride !== undefined ? stepOverride : (data.wizardStep ?? 0),
    wizardStep: stepOverride !== undefined ? stepOverride : (data.wizardStep ?? 0),
  };
}

export function restoreFromContractData(
  contractRow: any,
  prev: ContractStudioData
): Partial<ContractStudioData> {
  let cd = contractRow.contract_data as Record<string, unknown> | string | undefined;
  if (typeof cd === 'string') {
    try {
      cd = JSON.parse(cd);
    } catch {
      cd = {};
    }
  }
  const data = (cd && typeof cd === 'object' ? cd : {}) as Record<string, unknown>;

  const updates: Partial<ContractStudioData> = {
    id: String(contractRow.id),
    contractNumber: (contractRow.contract_number as string) || prev.contractNumber,
    status: (contractRow.status as 'draft' | 'sent' | 'signed') || prev.status,
    leadId: contractRow.lead_id ? String(contractRow.lead_id) : prev.leadId,
    clientId: contractRow.client_id ? String(contractRow.client_id) : prev.clientId,
  };

  if (data.wizard_step !== undefined || data.wizardStep !== undefined) {
    const ws = Number(data.wizard_step !== undefined ? data.wizard_step : data.wizardStep);
    if (!isNaN(ws) && ws >= 0 && ws < 8) {
      updates.wizardStep = ws;
    }
  }

  if (data.contract_title) updates.contractTitle = String(data.contract_title);
  if (data.property_photo_url) updates.propertyPhotoUrl = String(data.property_photo_url);
  if (data.prepared_by_name) updates.preparedByName = String(data.prepared_by_name);
  if (data.prepared_by_title) updates.preparedByTitle = String(data.prepared_by_title);
  if (data.contractor_signatory_name) updates.contractorSignatoryName = String(data.contractor_signatory_name);
  if (data.contractor_signatory_title) updates.contractorSignatoryTitle = String(data.contractor_signatory_title);
  if (data.client_name || contractRow.customer_name) {
    updates.clientName = String(data.client_name || contractRow.customer_name);
  }
  if (contractRow.customer_phone) updates.clientPhone = String(contractRow.customer_phone);
  if (contractRow.customer_email) updates.clientEmail = String(contractRow.customer_email);
  if (data.project_address || contractRow.customer_address) {
    updates.projectAddress = cleanAddressString(String(data.project_address || contractRow.customer_address));
  }
  if (contractRow.customer_city) updates.city = String(contractRow.customer_city);
  if (data.contractor_name) updates.contractorName = String(data.contractor_name);
  if (data.contractor_title) updates.contractorTitle = String(data.contractor_title);
  if (data.salesperson_name || contractRow.salesperson) {
    updates.salespersonName = String(data.salesperson_name || contractRow.salesperson);
  }
  if (data.contract_date) updates.contractDate = String(data.contract_date);
  if (data.contract_date_short) updates.contractDateShort = String(data.contract_date_short);
  if (data.scope_title) updates.scopeTitle = String(data.scope_title);
  if (data.scope_intro) updates.scopeIntro = String(data.scope_intro);
  if (Array.isArray(data.scope_sections) && data.scope_sections.length > 0) {
    updates.scopeSections = data.scope_sections.map((s: Record<string, unknown>, i: number) => ({
      id: String(i + 1),
      heading: String(s.heading || ''),
      text: String(s.text || ''),
    }));
  }
  if (data.start_date) updates.approxStartDate = String(data.start_date);
  if (data.commencement_date) updates.substantialCommencementDate = String(data.commencement_date);
  if (data.completion_date) updates.approxCompletionDate = String(data.completion_date);
  if (data.contract_price || contractRow.estimated_value) {
    updates.contractPrice = parsePrice(data.contract_price || contractRow.estimated_value, prev.contractPrice);
  }
  if (data.downpayment) updates.downpayment = parsePrice(data.downpayment, prev.downpayment);
  if (data.finance_charge) updates.financeCharge = String(data.finance_charge);
  if (Array.isArray(data.payment_schedule) && data.payment_schedule.length > 0) {
    updates.paymentSchedule = data.payment_schedule.map((p: Record<string, unknown>, i: number) => ({
      id: String(i + 1),
      number: String(p.number || `${i + 1}.`),
      description: String(p.description || ''),
      amount: parsePrice(p.amount, 0),
    }));
  }
  if (data.license_number) updates.contractorLicense = String(data.license_number);
  if (data.client_initials) updates.clientInitials = String(data.client_initials);
  if (data.insurance_carrier) updates.insuranceCarrier = String(data.insurance_carrier);
  if (data.insurance_phone) updates.insurancePhone = String(data.insurance_phone);
  if (data.workers_comp_carrier) updates.workersCompCarrier = String(data.workersCompCarrier);
  if (data.cancellation_email) updates.cancellationEmail = String(data.cancellation_email);
  if (contractRow.signing_token) updates.signingToken = String(contractRow.signing_token);

  if (data.licensing_clause) updates.licensingClause = String(data.licensing_clause);
  if (data.change_order_clause) updates.changeOrderClause = String(data.change_order_clause);
  if (data.payment_terms_text) updates.paymentTermsText = String(data.payment_terms_text);
  if (data.refund_policy_text) updates.refundPolicyText = String(data.refund_policy_text);
  if (data.liability_insurance_text) updates.liabilityInsuranceText = String(data.liability_insurance_text);
  if (data.workers_comp_text) updates.workersCompText = String(data.workers_comp_text);
  if (data.mechanics_lien_warning_text) updates.mechanicsLienWarningText = String(data.mechanics_lien_warning_text);
  if (data.cslb_disclosure_text) updates.cslbDisclosureText = String(data.cslb_disclosure_text);
  if (data.representations_text) updates.representationsText = String(data.representations_text);
  if (data.general_provisions_text) updates.generalProvisionsText = String(data.general_provisions_text);
  if (data.term_termination_text) updates.termTerminationText = String(data.term_termination_text);
  if (data.bond_text) updates.bondText = String(data.bond_text);
  if (data.three_day_notice_text) updates.threeDayNoticeText = String(data.three_day_notice_text);
  if (data.five_day_notice_text) updates.fiveDayNoticeText = String(data.five_day_notice_text);
  if (data.jobsite_standards_text) updates.jobsiteStandardsText = String(data.jobsite_standards_text);
  if (data.decking_allowance_text) updates.deckingAllowanceText = String(data.decking_allowance_text);

  return updates;
}

export function computeInitialContractData(prefill?: WizardPrefill, userName?: string): ContractStudioData {
  const base: ContractStudioData = {
    ...DEFAULT_CONTRACT,
    salespersonName: userName || DEFAULT_CONTRACT.salespersonName,
    preparedByName: userName || 'Rise Up Representative',
    preparedByTitle: 'Project Manager',
  };
  if (!prefill || (!prefill.clientName && !prefill.leadId && !prefill.address)) {
    return base;
  }
  const val = prefill.value && prefill.value > 0 ? prefill.value : 0;
  const dp = val > 0 ? Math.min(1000, Math.round(val * 0.1)) : 0;
  const rem = Math.max(0, val - dp);
  const p1 = Math.round(rem * 0.3);
  const p2 = Math.round(rem * 0.3);
  const p3 = Math.max(0, val - dp - p1 - p2);

  const paymentSchedule: ContractPaymentRow[] = val > 0 ? [
    { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
    { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
    { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
    { id: '4', number: '4.', description: 'Final Payment (Installation complete & walkthrough)', amount: p3 },
  ] : [];

  return {
    ...base,
    leadId: prefill.leadId || base.leadId,
    clientId: prefill.clientId || base.clientId,
    clientName: prefill.clientName || base.clientName,
    clientInitials: '',
    clientPhone: prefill.phone || base.clientPhone,
    clientEmail: prefill.email || base.clientEmail,
    projectAddress: prefill.address || base.projectAddress,
    city: prefill.city || base.city,
    scopeTitle: prefill.service ? `${prefill.service} System Installation` : base.scopeTitle,
    contractPrice: val,
    downpayment: dp,
    salespersonName: userName || base.salespersonName,
    preparedByName: userName || base.preparedByName,
    paymentSchedule: paymentSchedule.length > 0 ? paymentSchedule : base.paymentSchedule,
  };
}
