/**
 * Canonical backend entity types for the Rise Up CRM.
 * These match the FastAPI response shapes from the backend API.
 * Import from here instead of individual API files.
 */

export interface BackendLead {
  id: number;
  client_id?: number | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  service_type?: string | null;
  pipeline_stage?: string | null;
  granular_stage?: string;
  status: string;
  priority?: string;
  lead_score?: number | null;
  estimated_value?: number | null;
  contract_value?: number | null;
  estimate_total?: number | null;
  stage_entered_at?: string | null;
  initial_contacted_at?: string | null;
  site_visit_scheduled_at?: string | null;
  site_visit_completed_at?: string | null;
  proposal_sent_at?: string | null;
  contract_signed_at?: string | null;
  contract_status?: string | null;
  contract_id?: number | null;
  contract_number?: string | null;
  job_completed_at?: string | null;
  job_id?: number | null;
  job_status?: string | null;
  assigned_to_user_id?: number | null;
  assigned_to_name?: string | null;
  assigned_to_role?: string | null;
  assigned_to_avatar?: string | null;
  hours_in_stage?: number;
  days_in_stage?: number;
  sla_status?: string;
  sla_badge_label?: string;
  sla_alert_message?: string;
  photo_count?: number;
  lead_source?: string | null;
  lead_source_detail?: string | null;
  source_type?: string | null;
  created_by_user_id?: number | null;
  created_by_name?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  lost_notes?: string | null;
  lost_at?: string | null;
  checklist?: Array<{ id: string; label: string; done: boolean }>;
  checklist_completed_count?: number;
  checklist_completed_keys?: string[];
  created_at: string;
  updated_at?: string | null;
  is_followup_overdue?: boolean;
  followup_days_remaining?: number;
  followup_hours_remaining?: number;
  hours_until_auto_move?: number | null;
  last_contact_at?: string | null;
  follow_up_at?: string | null;
  form_type?: string | null;
  property_type?: string | null;
  roof_type?: string | null;
  roof_sqf?: number | null;
  pitch?: string | null;
  stories?: string | null;
  hoa?: boolean;
}

export interface BackendClient {
  id: number;
  full_name: string;
  phone?: string | null;
  phone_normalized?: string | null;
  email?: string | null;
  secondary_phone?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  zip_code?: string | null;
  property_type?: string | null;
  roof_type?: string | null;
  roof_sqf?: number | null;
  roof_age?: number | null;
  stories?: number | string | null;
  hoa?: boolean | null;
  status?: string | null;
  client_category?: string | null;
  total_revenue?: number | null;
  total_jobs_count?: number | null;
  assigned_to_user_id?: number | null;
  assigned_to_name?: string | null;
  acquired_by_user_id?: number | null;
  acquired_by_name?: string | null;
  acquired_by_role?: string | null;
  acquired_by_avatar?: string | null;
  source_type?: string | null;
  lead_source_detail?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at?: string | null;
  lost_reason?: string | null;
  lead_lost_reason?: string | null;
  latest_estimate_total?: number | null;
  total_billed?: number | null;
  total_paid?: number | null;
  balance_due?: number | null;
}

export interface BackendJob {
  id: number;
  job_number?: string;
  name?: string;
  status?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  address?: string;
  city?: string;
  zip?: string;
  service_type?: string;
  contract_value?: number;
  contract_amount?: number;
  crew_lead?: string;
  foreman_name?: string;
  crew_members?: string[];
  scheduled_start?: string;
  start_date?: string;
  estimated_days?: number;
  actual_start?: string;
  actual_end?: string;
  completed_at?: string;
  progress_pct?: number;
  weather_delays?: number;
  notes?: string;
  milestones?: any[]; // JSON blob parsed with explicit casts in jobsApi normalizeJob
  lead_id?: number | null;
  client_id?: number | null;
  estimate_id?: number | null;
  created_by?: number | null;
  created_by_role_snapshot?: string | null;
  created_at?: string;
  updated_at?: string;
}
