export interface JobMilestone {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  targetDate?: string;
  completedAt?: string;
  completedBy?: string;
  assignedTo?: string;
  notes?: string;
}

export interface JobRecord {
  id: number;
  job_number: string;
  status: 'active' | 'scheduled' | 'in_progress' | 'complete' | 'cancelled';
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  address?: string;
  city?: string;
  zip?: string;
  service_type?: string;
  contract_value: number;
  crew_lead?: string;
  crew_members?: string[];
  scheduled_start?: string;
  estimated_days?: number;
  actual_start?: string;
  actual_end?: string;
  weather_delays?: number;
  notes?: string;
  milestones: JobMilestone[];
  milestone_progress?: number;
  milestones_completed_count?: number;
  milestones_total_count?: number;
  lead_id?: number;
  client_id?: number;
  estimate_id?: number;
  created_by?: number;
  created_by_role_snapshot?: string;
  created_at: string;
  updated_at: string;
}

export interface JobSummaryStats {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  totalValue: number;
  activeValue: number;
  milestoneVelocity: number;
  activeCrews: number;
}

export interface JobActivityItem {
  id: number;
  entity_type: string;
  entity_id: number;
  client_id?: number;
  activity_type: string;
  title: string;
  description: string;
  performed_by: string;
  user_id?: number;
  user_name?: string;
  metadata?: any;
  created_at: string;
}

export type JobFilterTab = 'all_active' | 'in_progress' | 'completed' | 'all';
