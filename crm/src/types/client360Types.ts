export type ClientStatus = 'active_job' | 'completed' | 'closed_lost' | 'lead_review';

export interface AssignedRep {
  name: string;
  role: string;
  badge: string;
  avatar?: string;
}

export interface RoofSpecs {
  address: string;
  cityZip: string;
  roofMaterial: string;
  roofAreaSqFt: number;
  roofSquares: number;
  stories: string;
  roofAgeYears: number;
  hoaCommunity: string;
  originRepName: string;
  pitch?: string;
  deckingCondition?: string;
  valleysCount?: number;
  solarPresent?: boolean;
}

export interface ActiveJob {
  jobId: string;
  title: string;
  stage: string;
  contractValue: number;
  crewLead: string;
  scheduledStart: string;
  progressPct?: number;
  targetCompletion?: string;
}

export interface LossPostMortem {
  opportunityId: string;
  title: string;
  proposedValue: number;
  lossReason: string;
  lossReasonKey: 'competitor_price' | 'ghosted' | 'postponed' | 'diy_handyman' | 'financing_denied' | 'out_of_area';
  lostDate: string;
  daysAgo: number;
  competitorName?: string;
  competitorBid?: number;
  autopsyNotes: string;
  riskVulnerabilities: string[];
  winBackDate: string;
  winBackStrategy: string;
  canReactivate: boolean;
}

export interface CompletedJob {
  jobId: string;
  title: string;
  totalPaid: number;
  installedDate: string;
  warrantyType: string;
  warrantyCertNumber: string;
  nextAnnualInspectionDate: string;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
}

export interface BillingSummary {
  totalBilled: number;
  collectedCash: number;
  pendingDeposit: number;
  invoicesOnFileCount: number;
  paymentHealthStatus: 'current_and_paid' | 'deposit_pending' | 'overdue' | 'no_billing_archived';
  paymentHealthMessage: string;
  invoices: ClientInvoice[];
}

export interface WarrantyCertificate {
  id: string;
  type: string;
  certNumber: string;
  issuer: string;
  termYears: number;
  coverage: string;
  validUntil: string;
}

export interface InspectionPhoto {
  id: string;
  title: string;
  url: string;
  severity: string;
  createdAt?: string;
}

export interface WarrantySummary {
  warrantiesCount: number;
  hasCertificate: boolean;
  statusText: string;
  certificates: WarrantyCertificate[];
  inspectionPhotos?: InspectionPhoto[];
}

export interface ClientTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  assignedTo: string;
  isWinBackTask?: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface TimelineEvent {
  id: string;
  type: 'call' | 'sms' | 'email' | 'meeting' | 'estimate' | 'inspection' | 'note' | 'system' | 'loss_autopsy';
  title: string;
  date: string;
  author: string;
  details: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
}

export interface ClientQuote {
  id: string;
  quoteNumber: string;
  title: string;
  amount: number;
  status: 'approved' | 'sent' | 'draft' | 'declined';
  date: string;
  tierOptions?: { name: string; price: number; selected: boolean }[];
}

export interface Client360Record {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  status: ClientStatus;
  statusLabel: string;
  assignedRep: AssignedRep;
  originSource: string;
  roofSpecs: RoofSpecs;
  activeJob?: ActiveJob;
  lossPostMortem?: LossPostMortem;
  completedJob?: CompletedJob;
  billingSummary: BillingSummary;
  warrantySummary: WarrantySummary;
  inspectionPhotos?: InspectionPhoto[];
  tasks: ClientTask[];
  timeline: TimelineEvent[];
  quotes: ClientQuote[];
}
