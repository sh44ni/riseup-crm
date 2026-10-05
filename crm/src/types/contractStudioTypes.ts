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
  status: 'draft' | 'sent' | 'signed' | 'client_signed' | string;
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

  // Cover Page (Page 1)
  contractTitle?: string;
  propertyPhotoUrl?: string;
  preparedByName?: string;
  preparedByTitle?: string;

  // Editable Legal Clauses (Rule 11)
  licensingClause?: string;
  changeOrderClause?: string;
  paymentTermsText?: string;
  refundPolicyText?: string;
  liabilityInsuranceText?: string;
  workersCompText?: string;
  mechanicsLienWarningText?: string;
  cslbDisclosureText?: string;
  representationsText?: string;
  generalProvisionsText?: string;
  termTerminationText?: string;
  bondText?: string;
  threeDayNoticeText?: string;
  fiveDayNoticeText?: string;
  jobsiteStandardsText?: string;
  deckingAllowanceText?: string;

  // Execution & Signature info
  isSigned: boolean;
  signedAt?: string;
  client_signed_at?: string;
  clientInitials: string;
  clientSignatureName: string;
  clientSignatureData?: string;
  clientSignatureType?: 'typed' | 'drawn';
  clientSignatureTime?: string;
  contractorSignatureName: string;
  contractorSignatureData?: string;
  contractor_signature_data?: string;
  contractorSignatureTime?: string;
  isCounterSigned?: boolean;
  is_counter_signed?: boolean;
  counterSignedAt?: string;
  counter_signed_at?: string;
  signingToken?: string;
  signingUrl?: string;
  signedPdfUrl?: string;
  isSeniorCitizen?: boolean;
  isRepresentativeSignatory?: boolean;
  representativeName?: string;
  representativeTitle?: string;
  wizardStep?: number;
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

export const DEFAULT_LICENSING_CLAUSE =
  'The Contractor warrants that the Contractor currently holds a valid license under the laws of the State of California to perform the work. The work performed will be done so in compliance with all applicable local, state, or federal statutes and regulations.';

export const DEFAULT_CHANGE_ORDER_CLAUSE =
  'Extra Work and Change Orders become part of the contract once prepared in writing and signed by the parties prior to commencement of work covered by the new change order. The order must describe the scope of extra work, cost added or subtracted, and effect on progress payments or completion date prior to commencement.';

export const DEFAULT_PAYMENT_TERMS_TEXT =
  'Payment shall be made to the Contractor via cash, cashier’s check, or money order. Invoices are due UPON COMPLETION of each milestone phase. Accounts unpaid after 4 business days incur a $25.00 late fee or 1.5% monthly finance charge. Necessary extra materials expenses reimbursed within 2 days of receipt. Upon each payment, Contractor furnishes full and unconditional statutory lien releases pursuant to California Civil Code Sections 8400 & 8404.';

export const DEFAULT_REFUND_POLICY_TEXT =
  'Refund Policy: 1.6.2(a) No Refunds: Services completed and materials procured as described in this contract are not subject to refunds. The Client will not be reimbursed for services cancelled once work has begun. All sales are final upon substantial commencement.';

export const DEFAULT_LIABILITY_INSURANCE_TEXT =
  'Rise Up Roofing and Construction, Inc. carries commercial general liability, excess umbrella, and commercial vehicle insurance written by PACIFIC UNITED INSURANCE SERVICES. You may contact them directly at (619) 274-8144 to request an official certificate of insurance.';

export const DEFAULT_WORKERS_COMP_TEXT =
  'Rise Up Roofing and Construction, Inc. carries workers’ compensation insurance for all jobsite employees and roofing crew members written by PACIFIC UNITED INSURANCE SERVICES. You may call to verify active policy status.';

export const DEFAULT_MECHANICS_LIEN_WARNING_TEXT =
  'Anyone who helps improve your property, but who is not paid, may record what is called a mechanics lien on your property. A mechanics lien is a claim, like a mortgage or home equity loan, made against your property and recorded with the county recorder. Even if you pay your contractor in full, unpaid subcontractors, suppliers, and laborers who helped to improve your property may record mechanics liens and sue you in court to foreclose the lien. If a court finds the lien is valid, you could be forced to pay twice or have a court officer sell your home to pay the lien. Liens can also affect your credit.\n\nBE CAREFUL. The Preliminary Notice can be sent up to 20 days after the subcontractor starts work or the supplier provides material. This can be a big problem if you pay your contractor before you have received the Preliminary Notices. You will not get Preliminary Notices from your prime contractor or from laborers who work on your project. The law assumes that you already know they are improving your property.\n\nPROTECT YOURSELF FROM LIENS. You can protect yourself from liens by getting a list from your contractor of all the subcontractors and material suppliers that work on your project. Find out from your contractor when these subcontractors started work and when these suppliers delivered goods or materials. Then wait 20 days, paying attention to the Preliminary Notices you receive.\n\nPAY WITH JOINT CHECKS. One way to protect yourself is to pay with a joint check. When your contractor tells you it is time to pay for the work of a subcontractor or supplier who has provided you with a Preliminary Notice, write a joint check payable to both the contractor and the subcontractor or material supplier. Visit CSLB at www.cslb.ca.gov or call 800-321-CSLB (2752). REMEMBER, IF YOU DO NOTHING, YOU RISK HAVING A LIEN PLACED ON YOUR HOME.';

export const DEFAULT_CSLB_DISCLOSURE_TEXT =
  'CSLB is the state consumer protection agency that licenses and regulates construction contractors. Contact CSLB for information about the licensed contractor you are considering, including information about disclosable complaints, disciplinary actions, and civil judgments that are reported to CSLB.\n\nUse only licensed contractors. If you file a complaint against a licensed contractor within the legal deadline (usually four years), CSLB has authority to investigate the complaint. If you use an unlicensed contractor, CSLB may not be able to help you resolve your complaint. Your only remedy may be in civil court, and you may be liable for damages arising out of any injuries to the unlicensed contractor or the unlicensed contractor’s employees.';

export const DEFAULT_REPRESENTATIONS_TEXT =
  'Authority to Sign: Each party warrants and represents that it has full authority to enter into and perform this Contract. Client Review: Client agrees to review work, be reasonably available, provide timely decisions, and ensure uninterrupted access to worksite water and electrical utilities.';

export const DEFAULT_GENERAL_PROVISIONS_TEXT =
  'Signatures: Electronic and hardcopy signatures count as legal originals for all purposes. Compliance with Laws: Contractor warrants all work complies with California Building Standards Code (Title 24) and local ordinances. Severability: Unenforceability of any term shall not impair remainder.';

export const DEFAULT_TERM_TERMINATION_TEXT =
  'This contract ends upon final completion and payment. If terminated earlier per contract terms, Client is responsible for paying for all work completed and material expenses incurred up to that date.';

export const DEFAULT_BOND_TEXT =
  'The Client has the legal right to require the Contractor to have a performance and payment bond, the expense of which may be borne by the Client as provided by California law.';

export const DEFAULT_THREE_DAY_NOTICE_TEXT =
  'The Client has the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the Contractor at the Contractor’s place of business by midnight of the third business day after you receive a signed and dated copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice.\n\nIf you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk.\n\nIf you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.';

export const DEFAULT_FIVE_DAY_NOTICE_TEXT =
  'The Client has the right to cancel this contract within five business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the Contractor at the Contractor’s place of business by midnight of the fifth business day after you received a signed and dated copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice.\n\nIf you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk.\n\nIf you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.';

export const DEFAULT_JOBSITE_STANDARDS_TEXT =
  'Contractor warrants that all jobsite safety protocols, property protection tarps, landscape barriers, and magnetic sweeps of driveways and walkways are conducted daily. All roofing work adheres strictly to manufacturer specifications and California Building Standards Code (Title 24).';

export const DEFAULT_DECKING_ALLOWANCE_TEXT =
  'Pricing is based on the existing roof structure being in serviceable condition. Concealed structural damage, deteriorated wood, or framing repairs will be reviewed before proceeding and documented via written change order.';

export const TOTAL_CONTRACT_PAGES = 7;

export const CONTRACT_WIZARD_STEPS = [
  { id: 'details', label: 'Client & Cover', previewPage: 1 },
  { id: 'scope', label: 'Scope of Work', previewPage: 2 },
  { id: 'dates-pricing', label: 'Dates & Pricing', previewPage: 3 },
  { id: 'payments', label: 'Payment Schedule', previewPage: 3 },
  { id: 'terms', label: 'Insurance & Disclosures', previewPage: 4 },
  { id: 'signatures', label: 'Signatures & Provisions', previewPage: 5 },
  { id: 'cancellation', label: 'Cancellation Notices', previewPage: 6 },
  { id: 'review', label: 'Review & Deliver', previewPage: 7 },
];
