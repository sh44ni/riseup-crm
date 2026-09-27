export type OperationCategory =
  | 'team_task'        // General team task / follow-up
  | 'client_meeting'   // Sales consultation, site inspection, customer meeting
  | 'project_op'       // Jobsite walkthrough, production milestone, punchlist
  | 'permit_filing'    // City permit inspection or submission
  | 'warranty_audit'   // Warranty check-in & seal inspection
  | 'reminder'         // Internal reminder or milestone
  // Backwards-compatibility aliases
  | 'client_visit'
  | 'city_permit'
  | 'roof_install'
  | 'boom_delivery'
  | 'roof_inspection'
  | 'warranty_checkin'
  | 'manual_task';

export type CalendarEventCategory = OperationCategory;

export type OperationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type CalendarEventStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'weather_delay'
  | 'cancelled';

export interface TeamOperationEvent {
  id: string;
  numericId?: number;
  title: string;
  description?: string;
  category: OperationCategory;
  date: string; // YYYY-MM-DD
  dayNumber: number;
  month: number;
  year: number;
  startTime?: string;
  endTime?: string;
  dueAt?: string;
  endAt?: string;
  isAllDay?: boolean;
  completed?: boolean;
  completedAt?: string;
  status?: CalendarEventStatus;
  priority?: OperationPriority;
  assignedToUserId?: number;
  assignedToName: string;
  assignedToRole?: string;
  assignedToAvatarColor?: string;
  assignedToInitials?: string;
  createdByUserId?: number;
  createdByName?: string;
  entityType?: 'lead' | 'job' | 'client' | string;
  entityId?: number;
  entityName?: string;
  location?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  customerName?: string;
  jobCode?: string;
  sourceType?: 'task' | 'lead_visit' | 'job_schedule' | 'warranty' | 'inspection' | 'dispatch' | 'pipeline_job' | 'pipeline_lead';
  isSynced?: boolean;
  notes?: string;
  // Legacy aliases
  squares?: number;
  material?: string;
  deliverySupplier?: string;
  permitNumber?: string;
  permitType?: string;
  isWeatherSensitive?: boolean;
  crewId?: string;
  crewName?: string;
  foremanName?: string;
  foremanPhone?: string;
}

export type DispatchEvent = TeamOperationEvent;

export interface CalendarStats {
  activeTeamMembers: number;
  operationsToday: number;
  completedToday: number;
  upcomingDeliveries: number;
  pendingPermits: number;
  scheduleConflicts: number;
}

export interface CalendarWeather {
  tempF: number;
  windSpeedMph: number;
  gustMph: number;
  condition: string;
  safetyStatus: 'safe' | 'caution' | 'hazard';
  safetyLabel: string;
  city: string;
}

export interface TeamMemberResource {
  id: number | string;
  name: string;
  role: string;
  roleLabel?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatarColor?: string;
  initials?: string;
  status?: string;
}

/** @deprecated Transitioned to TeamMemberResource */
export type CrewResource = TeamMemberResource;

export interface WeatherCityInfo {
  city: string;
  tempF: number;
  condition: string;
  windSpeedMph: number;
  windDirection: string;
  gustMph: number;
  safetyStatus: 'safe' | 'caution' | 'hold';
  recommendation: string;
}

export interface CategoryMeta {
  id: OperationCategory;
  label: string;
  pillLabel: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotColor: string;
  badgeClass: string;
}
