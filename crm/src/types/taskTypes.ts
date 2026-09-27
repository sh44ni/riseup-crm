export type TaskCategory =
  | 'rise_up'
  | 'estimate_followup'
  | 'content_creation'
  | 'marketing'
  | 'permits_city'
  | 'general';

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export type TaskStatus = 'active' | 'completed' | 'deferred';

export interface CrmTask {
  id: string;
  title: string;
  clientName?: string;
  estimateId?: string;
  estimateAmount?: number;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // ISO or date string
  dueDateFormatted: string; // e.g. 'Sep 19, 9:00 PM'
  isOverdue?: boolean;
  isToday?: boolean;
  isUpcoming?: boolean;
  assignedTo: string; // e.g. 'Unassigned' | 'Carlos Morales' | 'Dave Miller'
  assignedToUserId?: number;
  assignedInitials?: string;
  completedAt?: string;
  entityType?: string;
  entityId?: number;
}

export interface PersonalStickyNote {
  id: string;
  title: string;
  content: string;
  color: 'yellow' | 'amber' | 'sky' | 'emerald' | 'purple' | 'rose';
  updatedAt: string;
  isPinned: boolean;
}

export interface PriorityMeta {
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotColor: string;
}

export interface TaskCategoryMeta {
  id: TaskCategory;
  label: string;
  pillClass: string;
}
