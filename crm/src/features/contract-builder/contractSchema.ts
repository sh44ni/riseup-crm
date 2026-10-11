import { z } from 'zod';

export const ScopeSectionSchema = z.object({
  id: z.string().optional(),
  heading: z.string().min(1, 'Section heading is required'),
  text: z.string().min(1, 'Section text is required'),
});

export const PaymentRowSchema = z.object({
  id: z.string().optional(),
  number: z.string(),
  description: z.string().min(1, 'Payment description is required'),
  amount: z.number().nonnegative(),
});

export const ContractFormSchema = z.object({
  id: z.string().optional(),
  contractNumber: z.string().optional(),
  status: z.enum(['draft', 'sent', 'client_signed', 'signed']).default('draft'),
  createdAt: z.string().optional(),

  // Cover Page info
  contractTitle: z.string().optional().default('HOME IMPROVEMENT CONTRACT'),
  propertyPhotoUrl: z.string().optional().default(''),
  preparedByName: z.string().optional().default(''),
  preparedByTitle: z.string().optional().default('Project Manager'),

  // Client & Lead info
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().optional().default(''),
  clientEmail: z.string().optional().default(''),
  projectAddress: z.string().min(1, 'Project address is required'),
  city: z.string().optional().default(''),
  state: z.string().optional().default('CA'),
  zip: z.string().optional().default(''),

  // Contractor & Staff info
  contractorName: z.string().min(1, 'Contractor name is required'),
  contractorTitle: z.string().optional().default('Project Manager'),
  contractorLicense: z.string().min(1, 'Contractor license is required'),
  salespersonName: z.string().min(1, 'Salesperson name is required'),
  contractDate: z.string().min(1, 'Contract date is required'),
  contractDateShort: z.string().optional().default(''),

  // Milestones & Dates
  approxStartDate: z.string().optional().default(''),
  substantialCommencementDate: z.string().optional().default(''),
  approxCompletionDate: z.string().optional().default(''),

  // Scope of Work
  scopeTitle: z.string().min(1, 'Scope title is required'),
  scopeIntro: z.string().optional().default(''),
  scopeSections: z.array(ScopeSectionSchema).min(1, 'At least one scope section is required'),

  // Pricing & Payment
  contractPrice: z.number().positive('Contract price must be greater than 0'),
  downpayment: z.number().nonnegative().default(0),
  financeCharge: z.string().optional().default('0.00'),
  paymentSchedule: z.array(PaymentRowSchema).min(1, 'At least one payment row is required'),

  // Terms & Legal
  cancellationDeadlineDays: z.number().default(3),
  cancellationEmail: z.string().optional().default(''),
  insuranceCarrier: z.string().optional().default(''),
  insurancePhone: z.string().optional().default(''),
  workersCompCarrier: z.string().optional().default(''),
  workersCompPhone: z.string().optional().default(''),

  // Rule 11 Editable Legal Clauses
  licensingClause: z.string().optional(),
  changeOrderClause: z.string().optional(),
  paymentTermsText: z.string().optional(),
  refundPolicyText: z.string().optional(),
  liabilityInsuranceText: z.string().optional(),
  workersCompText: z.string().optional(),
  mechanicsLienWarningText: z.string().optional(),
  cslbDisclosureText: z.string().optional(),
  representationsText: z.string().optional(),
  generalProvisionsText: z.string().optional(),
  termTerminationText: z.string().optional(),
  bondText: z.string().optional(),
  threeDayNoticeText: z.string().optional(),
  fiveDayNoticeText: z.string().optional(),
  jobsiteStandardsText: z.string().optional(),
  deckingAllowanceText: z.string().optional(),

  // Execution & Signatures
  isSigned: z.boolean().default(false),
  signedAt: z.string().optional().nullable(),
  client_signed_at: z.string().optional().nullable(),
  clientInitials: z.string().optional().default(''),
  clientSignatureName: z.string().optional().default(''),
  clientSignatureData: z.string().optional().default(''),
  clientSignatureType: z.enum(['typed', 'drawn']).optional(),
  clientSignatureTime: z.string().optional(),
  contractorSignatoryName: z.string().optional().default(''),
  contractorSignatoryTitle: z.string().optional().default(''),
  contractorSignatureName: z.string().optional().default(''),
  contractorSignatureData: z.string().optional().default(''),
  contractor_signature_data: z.string().optional().default(''),
  contractorSignatureTime: z.string().optional(),
  isCounterSigned: z.boolean().optional().default(false),
  is_counter_signed: z.boolean().optional().default(false),
  counterSignedAt: z.string().optional().nullable(),
  counter_signed_at: z.string().optional().nullable(),
  signingToken: z.string().optional(),
  signingUrl: z.string().optional(),
  signedPdfUrl: z.string().optional().nullable(),
  isSeniorCitizen: z.boolean().optional().default(false),
});

export type ContractFormData = z.infer<typeof ContractFormSchema>;
export type ScopeSectionInput = z.infer<typeof ScopeSectionSchema>;
export type PaymentRowInput = z.infer<typeof PaymentRowSchema>;
