import { apiFetch } from '@/lib/api';
/**
 * Rise Up CRM — Unified Team Operations & Task Calendar API Client
 * 
 * Handles fetching, scheduling, updating, completing, and deleting team operations
 * and tasks. Connects to PostgreSQL `tasks`, scheduled `leads`, `jobs`, and `warranties`
 * via FastAPI endpoints with local-first resilient fallback.
 */

import { TeamOperationEvent, DispatchEvent, CalendarStats, CalendarWeather } from '@/types/calendarTypes';

export interface CalendarEventsApiResponse {
  success: boolean;
  data: TeamOperationEvent[];
  events?: TeamOperationEvent[];
  message?: string;
}

export interface SingleCalendarEventApiResponse {
  success: boolean;
  data: TeamOperationEvent;
  task?: any;
  message?: string;
}



/**
 * Fetch unified team operations and calendar schedule from backend
 */
export async function fetchCalendarEventsFromBackend(params?: {
  startDate?: string;
  endDate?: string;
  assignedToUserId?: string | number;
  category?: string;
  status?: string;
}): Promise<TeamOperationEvent[] | null> {
  try {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.assignedToUserId && params.assignedToUserId !== 'all') {
      query.append('assignedToUserId', String(params.assignedToUserId));
    }
    if (params?.category && params.category !== 'all') {
      query.append('category', params.category);
    }
    if (params?.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    try {
      const json = await apiFetch<CalendarEventsApiResponse>(`/admin/calendar${qs}`);
      return Array.isArray(json.data) ? json.data : (Array.isArray(json.events) ? json.events : null);
    } catch {
      return await fetchLegacyCalendarEvents(params);
    }
  } catch {
    return null;
  }
}

export const fetchCalendarOperations = fetchCalendarEventsFromBackend;

/**
 * Fallback to legacy events endpoint
 */
async function fetchLegacyCalendarEvents(params?: any): Promise<TeamOperationEvent[] | null> {
  try {    const json = await apiFetch<CalendarEventsApiResponse>('/admin/calendar/events');
    return json.success && Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Fetch registered CRM user accounts from backend
 */
export async function fetchRegisteredUsers(): Promise<any[]> {
  try {    const json = await apiFetch<any>('/admin/users');
    return json.users || [];
  } catch {
    return [];
  }
}

/**
 * Fetch active pipeline leads from backend for entity linking
 */
export async function fetchPipelineJobs(): Promise<any[]> {
  try {    const json = await apiFetch<any>('/admin/leads');
    return json.leads || [];
  } catch {
    return [];
  }
}

/**
 * Fetch active signed jobs from backend for entity linking
 */
export async function fetchRealJobs(): Promise<any[]> {
  try {    const json = await apiFetch<any>('/admin/jobs');
    return json.jobs || json.data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch dynamic operations and workload stats
 */
export async function fetchCalendarStats(): Promise<CalendarStats | null> {
  try {    const json = await apiFetch<any>('/admin/calendar/stats');
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Fetch live North County weather & OSHA wind safety
 */
export async function fetchCalendarWeather(): Promise<CalendarWeather | null> {
  try {    const json = await apiFetch<any>('/admin/calendar/weather');
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Create a new team operation or task on the backend
 */
export async function createCalendarEventOnBackend(
  event: TeamOperationEvent
): Promise<TeamOperationEvent | null> {
  try {
    const payload = {
      title: event.title,
      description: event.description || event.notes,
      category: event.category,
      eventType: event.category,
      assignedToUserId: event.assignedToUserId,
      assignedTo: event.assignedToName,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      dueAt: event.dueAt,
      endAt: event.endAt,
      priority: event.priority,
      entityType: event.entityType,
      entityId: event.entityId,
    };    const json = await apiFetch<any>('/admin/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const createdTask = json.task || json.data;
    if (createdTask) {
      return {
        ...event,
        id: `task-${createdTask.id}`,
        numericId: createdTask.id,
      };
    }
    return event;
  } catch {
    return null;
  }
}

export const createTeamTask = createCalendarEventOnBackend;

/**
 * Update an existing operation or task on the backend
 */
export async function updateCalendarEventOnBackend(
  id: string,
  updates: Partial<TeamOperationEvent>
): Promise<boolean> {
  try {
    const payload: Record<string, any> = { id };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined || updates.notes !== undefined) {
      payload.description = updates.description || updates.notes;
    }
    if (updates.category !== undefined) {
      payload.category = updates.category;
      payload.eventType = updates.category;
    }
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.assignedToUserId !== undefined) payload.assignedToUserId = updates.assignedToUserId;
    if (updates.assignedToName !== undefined) payload.assignedTo = updates.assignedToName;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.startTime !== undefined) payload.startTime = updates.startTime;
    if (updates.endTime !== undefined) payload.endTime = updates.endTime;
    if (updates.dueAt !== undefined) payload.dueAt = updates.dueAt;
    if (updates.endAt !== undefined) payload.endAt = updates.endAt;
    if (updates.completed !== undefined) payload.completed = updates.completed;
    if (updates.status !== undefined) {
      payload.completed = updates.status === 'completed';
    }    await apiFetch<any>('/admin/tasks', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}

export const updateTeamTask = updateCalendarEventOnBackend;

/**
 * Toggle task completion status
 */
export async function toggleTaskComplete(id: string, completed: boolean): Promise<boolean> {
  return updateCalendarEventOnBackend(id, { completed });
}

/**
 * Delete an operation or task on the backend
 */
export async function deleteCalendarEventOnBackend(id: string): Promise<boolean> {
  try {    await apiFetch<any>(`/admin/tasks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return false;
  }
}

export const deleteTeamTask = deleteCalendarEventOnBackend;
