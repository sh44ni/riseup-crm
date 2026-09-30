// Rise Up CRM - Unified Lead Types

export interface Lead {
  id: string | number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  clientId?: number | string;
  client_id?: number | string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'blue' | 'coral' | 'purple' | 'emerald';
  score?: number;
  status: 'new_lead' | 'contacted' | 'inspection_scheduled' | 'proposal_sent' | 'contract_won' | 'lost';
  source: string;
  sourceLabel: string;
  leadSourceDetail?: string;
  isClaimed?: boolean;
  claimedBy?: string;
  createdByName?: string;
  value: number;
  squares?: number;
  pitch?: string;
  assignedRep: string;
  repInitials: string;
  createdAt: string;
  createdDate?: string;
  speedToCall?: string;
  lossReason?: 'competitor_price' | 'ghosted' | 'postponed' | 'diy_handyman' | 'financing_denied' | 'out_of_area';
  lossNotes?: string;
  lostDate?: string;
  tags?: string[];
  notes?: string;
}

export type LeadStatus = Lead['status'];
export type LeadLossReason = NonNullable<Lead['lossReason']>;
