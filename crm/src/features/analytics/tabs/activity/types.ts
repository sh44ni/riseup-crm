export type ActivityAction = 'create' | 'update' | 'delete' | 'security';
export type ActivityCategory = 'contact' | 'status' | 'assignment' | 'security' | string;

export interface ActivityActor {
  user_id: number | null;
  name: string | null;
  email: string | null;
  role: string | null;
  type: string;
  ip_address: string | null;
}

export interface ActivityRecord {
  type: string;
  id: string | null;
  label: string | null;
  client_id: number | null;
  deleted: boolean;
}

export interface ActivityChange {
  old: unknown;
  new: unknown;
}

export interface ActivityEntry {
  id: number;
  occurred_at: string;
  source: string;
  action: ActivityAction;
  actor: ActivityActor;
  record: ActivityRecord;
  changed_fields: string[];
  categories: ActivityCategory[];
  changes: Record<string, ActivityChange> | null;
}

export interface ActivityDetail extends ActivityEntry {
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export interface ActivityPage {
  items: ActivityEntry[];
  next_cursor: string | null;
}

export interface ActivityFilterOptions {
  employees: { user_id: number; name: string | null; email: string | null }[];
  record_types: string[];
  categories: string[];
  actions: string[];
}

export interface ActivityFilters {
  employee_id?: string;
  client?: string;
  client_id?: string;
  action?: string;
  category?: string;
  record_type?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
}
