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
  value?: number;
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
