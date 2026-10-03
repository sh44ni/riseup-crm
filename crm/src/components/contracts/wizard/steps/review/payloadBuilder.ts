import { ContractStudioData } from '@/types/contractStudioTypes';

export function buildContractPayload(data: ContractStudioData, contractId?: number | null) {
  const fullAddress = [
    data.projectAddress,
    data.city,
    data.state ? `${data.state} ${data.zip || ''}`.trim() : data.zip,
  ]
    .filter(Boolean)
    .join(', ');

  const now = new Date();
  const defaultDateLong = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const defaultDateShort = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    lead_id: Number(data.leadId) || (data.clientId ? Number(data.clientId) : 1),
    contract_id: contractId || (data.id ? Number(data.id) : undefined),
    contract_data: {
      project_address: fullAddress || 'Property Address Pending',
      client_name: data.clientName || 'Valued Homeowner',
      contractor_name: data.contractorName || 'Rise Up Roofing Representative',
      contractor_title: data.contractorTitle || 'Project Manager',
      salesperson_name: data.salespersonName || '',
      contract_date: data.contractDate || defaultDateLong,
      contract_date_short: data.contractDateShort || defaultDateShort,
      scope_title: data.scopeTitle || 'Home Improvement Roofing Agreement',
      scope_sections: (data.scopeSections || []).map((s) => ({
        heading: s.heading,
        text: s.text,
      })),
      start_date: data.approxStartDate || 'To be scheduled upon permitting',
      commencement_date: data.substantialCommencementDate || 'Upon material delivery',
      completion_date: data.approxCompletionDate || 'Per contract schedule',
      contract_price: `$${(data.contractPrice || 0).toLocaleString()}`,
      finance_charge: data.financeCharge || 'N/A',
      downpayment: `$${(data.downpayment || 0).toLocaleString()}`,
      payment_schedule: (data.paymentSchedule || []).map((p) => ({
        number: p.number,
        description: p.description,
        amount: `$${(Number(p.amount) || 0).toLocaleString()}`,
      })),
      payment_schedule_total: `$${(data.contractPrice || 0).toLocaleString()}`,
      license_number: data.contractorLicense || '#1096492',
      cancellation_deadline: 'three business days from signing',
      client_initials: '',
      insurance_carrier: data.insuranceCarrier || '',
      insurance_phone: data.insurancePhone || '',
      workers_comp_carrier: data.workersCompCarrier || '',
      cancellation_email: data.cancellationEmail || 'info@riseuprac.com',
    },
  };
}
