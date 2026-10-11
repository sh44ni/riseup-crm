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
      client_phone: data.clientPhone || '',
      client_email: data.clientEmail || '',
      contractor_name: data.contractorName || 'Rise Up Roofing and Construction, Inc.',
      contractor_title: data.contractorTitle || 'Project Manager',
      contractor_license: data.contractorLicense || '1096492',
      license_number: data.contractorLicense || '1096492',
      salesperson_name: data.salespersonName || '',
      contract_date: data.contractDate || defaultDateLong,
      contract_date_short: data.contractDateShort || defaultDateShort,

      // Cover Page
      contract_title: data.contractTitle || 'HOME IMPROVEMENT CONTRACT',
      property_photo_url: data.propertyPhotoUrl || '',
      prepared_by_name: data.preparedByName || data.salespersonName || '',
      prepared_by_title: data.preparedByTitle || 'Project Manager',

      // Scope & Schedule
      scope_title: data.scopeTitle || 'Home Improvement Roofing Agreement',
      scope_intro: data.scopeIntro || '',
      scope_sections: (data.scopeSections || []).map((s) => ({
        heading: s.heading,
        text: s.text,
      })),
      start_date: data.approxStartDate || 'To be scheduled upon permitting',
      commencement_date: data.substantialCommencementDate || 'Upon material delivery',
      completion_date: data.approxCompletionDate || 'Per contract schedule',
      approx_start_date: data.approxStartDate || 'To be scheduled upon permitting',
      substantial_commencement_date: data.substantialCommencementDate || 'Upon material delivery',
      approx_completion_date: data.approxCompletionDate || 'Per contract schedule',
      contract_price: `$${(data.contractPrice || 0).toLocaleString()}`,
      finance_charge: data.financeCharge || 'N/A',
      downpayment: `$${(data.downpayment || 0).toLocaleString()}`,
      payment_schedule: (data.paymentSchedule || []).map((p) => ({
        number: p.number,
        description: p.description,
        amount: `$${(Number(p.amount) || 0).toLocaleString()}`,
      })),
      payment_schedule_total: `$${(data.contractPrice || 0).toLocaleString()}`,
      cancellation_deadline: 'three business days from signing',
      client_initials: data.clientInitials || '',
      insurance_carrier: data.insuranceCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
      insurance_phone: data.insurancePhone || '(619) 274-8144',
      workers_comp_carrier: data.workersCompCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
      workers_comp_phone: data.workersCompPhone || '(619) 274-8144',
      cancellation_email: data.cancellationEmail || 'accountant@riseuprac.com',

      // Rule 11 Statutory Clauses
      licensing_clause: data.licensingClause || '',
      change_order_clause: data.changeOrderClause || '',
      payment_terms_text: data.paymentTermsText || '',
      refund_policy_text: data.refundPolicyText || '',
      liability_insurance_text: data.liabilityInsuranceText || '',
      workers_comp_text: data.workersCompText || '',
      mechanics_lien_warning_text: data.mechanicsLienWarningText || '',
      cslb_disclosure_text: data.cslbDisclosureText || '',
      representations_text: data.representationsText || '',
      general_provisions_text: data.generalProvisionsText || '',
      term_termination_text: data.termTerminationText || '',
      bond_text: data.bondText || '',
      three_day_notice_text: data.threeDayNoticeText || '',
      five_day_notice_text: data.fiveDayNoticeText || '',
      jobsite_standards_text: data.jobsiteStandardsText || '',
      decking_allowance_text: data.deckingAllowanceText || '',
      // Company signature signer — the server re-stamps these from the configured signature.
      contractor_signatory_name: data.contractorSignatoryName || '',
      contractor_signatory_title: data.contractorSignatoryTitle || '',
    },
  };
}
