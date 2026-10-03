import type {
  ContractStudioData,
  ContractScopeSection,
  ContractPaymentRow,
} from '@/types/contractStudioTypes';
import {
  DEFAULT_CONTRACT_SECTIONS,
  DEFAULT_CONTRACT_PAYMENTS,
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

export const DEFAULT_CONTRACT: ContractStudioData = {
  status: 'draft',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  projectAddress: '',
  city: '',
  state: 'CA',
  zip: '',
  contractorName: 'Rise Up Roofing & Construction, Inc.',
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
  cancellationEmail: 'info@riseuprac.com',
  insuranceCarrier: 'State Compensation Insurance Fund',
  insurancePhone: '(888) 782-8338',
  workersCompCarrier: 'State Compensation Insurance Fund',
  workersCompPhone: '(888) 782-8338',
  isSigned: false,
  clientInitials: '',
  clientSignatureName: '',
  contractorSignatureName: '',
};

export function parsePrice(strOrNum: unknown, defaultVal = 0): number {
  if (typeof strOrNum === 'number') return isNaN(strOrNum) ? defaultVal : strOrNum;
  if (!strOrNum) return defaultVal;
  return parseMoney(String(strOrNum)) || defaultVal;
}

export function getContractDataPayload(data: ContractStudioData) {
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
    if (rawState && !projectAddress.includes(rawState)) {
      projectAddress += `, ${rawState}`;
    }
    if (rawZip && !projectAddress.includes(rawZip)) {
      projectAddress += ` ${rawZip}`;
    }
  } else if (rawCity || rawZip) {
    projectAddress = [rawCity, rawState, rawZip].filter(Boolean).join(' ');
  }

  const price = data.contractPrice || 0;
  const downpayment = data.downpayment || 0;

  return {
    project_address: projectAddress,
    client_name: data.clientName || '',
    contractor_name: data.contractorName || 'Rise Up Roofing & Construction, Inc.',
    contractor_title: data.contractorTitle || 'Licensed General Contractor',
    salesperson_name: data.salespersonName || '',
    contract_date: data.contractDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    contract_date_short: data.contractDateShort || '',
    scope_title: data.scopeTitle || 'Complete Roofing System Installation',
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
    insurance_carrier: data.insuranceCarrier || 'State Compensation Insurance Fund',
    insurance_phone: data.insurancePhone || '(888) 782-8338',
    workers_comp_carrier: data.workersCompCarrier || 'State Compensation Insurance Fund',
    cancellation_email: data.cancellationEmail || 'info@riseuprac.com',
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

  if (data.client_name || contractRow.customer_name) {
    updates.clientName = String(data.client_name || contractRow.customer_name);
  }
  if (contractRow.customer_phone) updates.clientPhone = String(contractRow.customer_phone);
  if (contractRow.customer_email) updates.clientEmail = String(contractRow.customer_email);
  if (data.project_address || contractRow.customer_address) {
    updates.projectAddress = String(data.project_address || contractRow.customer_address);
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

  return updates;
}

export function computeInitialContractData(prefill?: WizardPrefill, userName?: string): ContractStudioData {
  const base: ContractStudioData = {
    ...DEFAULT_CONTRACT,
    salespersonName: userName || DEFAULT_CONTRACT.salespersonName,
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
    paymentSchedule: paymentSchedule.length > 0 ? paymentSchedule : base.paymentSchedule,
  };
}
