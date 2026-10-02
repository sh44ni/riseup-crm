export interface DealCard {
  id: string;
  clientId?: number | string | null;
  name: string;
  location: string;
  address?: string;
  city?: string;
  zip?: string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue';
  time: string;
  phone?: string;
  email?: string;
  value?: number;          // collapsed value (kept for compat — prefer raw fields below)
  // Raw value fields for hierarchy resolution:
  contractValue?: number | null;     // from signed contract (highest priority)
  estimateTotal?: number | null;     // from formal estimate document
  estimatedValue?: number | null;    // from quick-quote / intake form
  roofSqf?: number | null;          // sq ft of the roof
  proposalSentAt?: string | null;    // ISO date when estimate was sent
  isUploadedEstimate?: boolean;      // estimate was uploaded manually (value unknown)
  estimateTemplateKey?: string | null;
  isFollowupOverdue?: boolean;
  hoursUntilAutoMove?: number | null;
  followupDaysRemaining?: number;
  followupHoursRemaining?: number;
  followUpAt?: string | null;
  leadSource?: string;
  leadSourceDetail?: string;
  sourceType?: string;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  notes?: string;
  contractSignedAt?: string | null;
  contractStatus?: string | null;
  isContractSigned?: boolean;
  granularStage?: string;
  pipelineStage?: string;
  siteVisitScheduledAt?: string | null;
}

export interface ColumnData {
  id: string;
  title: string;
  count: number;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  pillClass: string;
  badgeClass: string;
  iconType: 'users' | 'phone' | 'calendar' | 'file-text' | 'clock' | 'bell' | 'shield' | 'trophy' | 'briefcase';
  cards: DealCard[];
}
