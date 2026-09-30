export interface ContractScopeSection {
  id: string;
  heading: string;
  text: string;
}

export interface ContractPaymentRow {
  id: string;
  number: string;
  description: string;
  amount: number;
}

export interface ContractStudioData {
  id?: string;
  contractNumber?: string;
  status: 'draft' | 'sent' | 'signed';
  createdAt?: string;

  // Client & Lead info
  leadId?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  projectAddress: string;
  city: string;
  state: string;
  zip: string;

  // Contractor & Staff info
  contractorName: string;
  contractorTitle: string;
  contractorLicense: string;
  salespersonName: string;
  contractDate: string;
  contractDateShort: string;

  // Project Milestones & Dates
  approxStartDate: string;
  substantialCommencementDate: string;
  approxCompletionDate: string;

  // Scope of Work
  scopeTitle: string;
  scopeIntro: string;
  scopeSections: ContractScopeSection[];

  // Pricing & Payment
  contractPrice: number;
  downpayment: number;
  financeCharge: string;
  paymentSchedule: ContractPaymentRow[];

  // Legal & Terms
  cancellationDeadlineDays: number;
  cancellationEmail: string;
  insuranceCarrier: string;
  insurancePhone: string;
  workersCompCarrier: string;
  workersCompPhone: string;

  // Execution & Signature info
  isSigned: boolean;
  signedAt?: string;
  clientInitials: string;
  clientSignatureName: string;
  clientSignatureData?: string;
  clientSignatureType?: 'typed' | 'drawn';
  clientSignatureTime?: string;
  contractorSignatureName: string;
  contractorSignatureTime?: string;
  signingToken?: string;
  signingUrl?: string;
  signedPdfUrl?: string;
  isSeniorCitizen?: boolean;
}

export interface PublicContractData {
  id: number;
  contractNumber: string;
  status: 'draft' | 'sent' | 'signed' | string;
  signingToken: string;
  isSigned: boolean;
  signedAt?: string | null;
  signedPdfUrl?: string | null;
  isCounterSigned?: boolean;
  counterSignedAt?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectAddress: string;
  contractDate: string;
  contractorName: string;
  contractorLicense: string;
  salespersonName: string;
  approxStartDate: string;
  substantialCommencementDate: string;
  approxCompletionDate: string;
  scopeTitle: string;
  scopeIntro: string;
  scopeSections: Array<{ heading: string; text: string }>;
  contractPrice: string;
  downpayment: string;
  financeCharge: string;
  paymentSchedule: Array<{ number: string; description: string; amount: string }>;
  insuranceCarrier: string;
  insurancePhone: string;
  workersCompCarrier: string;
  workersCompPhone: string;
  cancellationEmail: string;
}

export interface PublicSignContractPayload {
  client_initials: string;
  signature_name: string;
  signature_type: 'typed' | 'drawn';
  signature_data?: string;
  is_senior_citizen: boolean;
  agreed_terms: boolean;
  agreed_scope?: boolean;
  agreed_milestones?: boolean;
  agreed_refund?: boolean;
  agreed_disclosures?: boolean;
  agreed_cancellation?: boolean;
}

export interface ContractStudioStepDef {
  id: string;
  label: string;
  shortTitle: string;
  description: string;
  pageFocus: number;
}

export const CONTRACT_STUDIO_STEPS: ContractStudioStepDef[] = [
  {
    id: 'project-details',
    label: 'Client & Property Info',
    shortTitle: 'Property & Client',
    description: 'Homeowner details, property address, and project timing.',
    pageFocus: 1,
  },
  {
    id: 'scope-materials',
    label: 'Scope of Work & Materials',
    shortTitle: 'Scope & Materials',
    description: 'Detailed scope, specifications, underlayment, and cleanup conditions.',
    pageFocus: 1,
  },
  {
    id: 'pricing-schedule',
    label: 'Pricing & Progress Payments',
    shortTitle: 'Price & Payments',
    description: 'Contract total, CSLB downpayment rule, and payment milestone schedule.',
    pageFocus: 2,
  },
  {
    id: 'terms-insurance',
    label: 'Terms, Insurance & Licensing',
    shortTitle: 'Terms & Insurance',
    description: 'California statutory notices, workers’ comp, and liability insurance.',
    pageFocus: 3,
  },
  {
    id: 'review-send',
    label: 'Review, Generate & Send',
    shortTitle: 'Review & Send',
    description: 'Final execution check, PDF compilation, and client email delivery.',
    pageFocus: 4,
  },
];

export const DEFAULT_CONTRACT_SECTIONS: ContractScopeSection[] = [
  {
    id: 'sec-1',
    heading: 'Scope of Work — Complete Roof System Installation',
    text: 'Rise Up Roofing & Construction Inc. will provide all labor, roofing materials, standard equipment, supervision, and project coordination required to complete the installation of the specified roofing system.',
  },
  {
    id: 'sec-2',
    heading: 'Roofing Materials & Components',
    text: 'Furnish Eagle Roofing Products Bel Air concrete roof tile (or customer selected premium materials), along with all standard accessories required for a complete professional installation.',
  },
  {
    id: 'sec-3',
    heading: 'Underlayment & Waterproofing',
    text: 'Furnish and install new heavy-duty synthetic/modified bitumen roofing underlayment throughout the complete roof deck, including proper overlaps, valley membranes, and penetration waterproofing.',
  },
  {
    id: 'sec-4',
    heading: 'Flashings, Metals & Penetrations',
    text: 'Furnish and install required standard galvanized/pre-painted roofing flashings, drip edge metal, pipe jacks, and counterflashings.',
  },
  {
    id: 'sec-5',
    heading: 'Labor, Equipment & Project Coordination',
    text: 'Provide professional roofing labor, safety staging, standard jobsite equipment, supervision, and project coordination necessary to complete the roofing scope described above.',
  },
  {
    id: 'sec-6',
    heading: 'Dump, Disposal & Jobsite Cleanup',
    text: 'Remove roofing debris generated by our work. Dump and disposal fees are included, followed by final daily jobsite cleanup and a magnetic sweep of all accessible ground areas.',
  },
  {
    id: 'sec-7',
    heading: 'Important Conditions & Decking Allowance',
    text: 'Pricing is based on the existing roof structure being in serviceable condition. Concealed structural damage, deteriorated wood, or framing repairs will be reviewed before proceeding and documented via written change order.',
  },
];

export const DEFAULT_CONTRACT_PAYMENTS: ContractPaymentRow[] = [
  {
    id: 'pay-1',
    number: '1.',
    description: 'Initial Downpayment (Contract execution / material allocation / scheduling)',
    amount: 1000,
  },
  {
    id: 'pay-2',
    number: '2.',
    description: 'Progress Payment 1 (Delivery of materials & teardown stage)',
    amount: 9300,
  },
  {
    id: 'pay-3',
    number: '3.',
    description: 'Progress Payment 2 (Underlayment, flashing & waterproofing complete)',
    amount: 9300,
  },
  {
    id: 'pay-4',
    number: '4.',
    description: 'Final Payment (Tile installation completion & final walkthrough)',
    amount: 11400,
  },
];

export const TOTAL_CONTRACT_PAGES = 6;

export const CONTRACT_WIZARD_STEPS = [
  { id: 'details', label: 'Client & Lead', previewPage: 1 },
  { id: 'scope', label: 'Scope of Work', previewPage: 1 },
  { id: 'dates-pricing', label: 'Dates & Pricing', previewPage: 2 },
  { id: 'payments', label: 'Payment Schedule', previewPage: 2 },
  { id: 'terms', label: 'Terms & Disclosures', previewPage: 3 },
  { id: 'signatures', label: 'Signatures & Execution', previewPage: 4 },
  { id: 'cancellation', label: 'Cancellation Notices', previewPage: 5 },
  { id: 'review', label: 'Review & Deliver', previewPage: 6 },
];
