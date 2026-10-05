export interface ContractRenderContext {
  // Client & Status
  clientName: string;
  clientInitials: string;
  isSigned: boolean;
  clientSignatureName: string;
  clientSignatureData: string;
  isClientSigned: boolean;
  isCounterSigned: boolean;
  executionStatusLabel: string;
  executionStatusSlug: string;
  contractorSignatureName: string;
  contractorSignatureData: string;
  contractorSignatureTitle?: string;
  isRepresentativeSignatory?: boolean;
  representativeName?: string;
  representativeTitle?: string;
  projectAddress: string;
  contractDate: string;
  contractDateShort: string;
  salespersonName: string;
  contractorName: string;
  contractorLicense: string;

  // Cover Page
  contractTitle: string;
  propertyPhotoUrl?: string;
  preparedByName: string;
  preparedByTitle: string;

  // Scope & Dates
  scopeTitle: string;
  scopeIntro: string;
  scopeSections: Array<{ heading: string; text: string }>;
  contractPrice: string;
  downpayment: string;
  financeCharge: string;
  approxStartDate: string;
  substantialCommencementDate: string;
  approxCompletionDate: string;
  cancellationEmail: string;
  insuranceCarrier: string;
  insurancePhone: string;
  workersCompCarrier: string;
  workersCompPhone: string;
  paymentRows: Array<{ number: string; description: string; amount: number }>;

  // Rule 11 Editable Legal Clauses
  licensingClause: string;
  changeOrderClause: string;
  paymentTermsText: string;
  refundPolicyText: string;
  liabilityInsuranceText: string;
  workersCompText: string;
  mechanicsLienWarningText: string;
  cslbDisclosureText: string;
  representationsText: string;
  generalProvisionsText: string;
  termTerminationText: string;
  bondText: string;
  threeDayNoticeText: string;
  fiveDayNoticeText: string;
  jobsiteStandardsText: string;
  deckingAllowanceText: string;

  // Timestamps
  signedAt?: string | null;
  counterSignedAt?: string | null;

  // Helpers
  fmt: (n: number) => string;
  escapeHtml: (s: string) => string;
}
