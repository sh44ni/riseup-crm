/**
 * Rise Up CRM — User Personal Tasks & Sticky Notes API Client
 * 
 * Manages user-specific to-dos and sticky notes with personal scope.
 * Uses centralized typed httpClient.
 */

import { httpClient } from '@/shared/api/client';

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type WorkCategory = string;

export interface PersonalTaskPayload {
  id: string;
  title: string;
  workCategory: WorkCategory;
  priority: TaskPriority;
  completed: boolean;
  dueDate?: string;
  notes?: string;
  sortOrder?: number;
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonalTasksListResponse {
  success: boolean;
  data: PersonalTaskPayload[];
  total: number;
  message?: string;
}

export interface SinglePersonalTaskResponse {
  success: boolean;
  data: PersonalTaskPayload;
  message?: string;
}

/**
 * Fetch current user's personal tasks
 */
export async function fetchPersonalTasksFromBackend(): Promise<PersonalTaskPayload[] | null> {
  try {
    const json = await httpClient.get<PersonalTasksListResponse>('/admin/users/me/tasks', { timeoutMs: 3000 });
    return json.success && Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Create a new personal task on the backend
 */
export async function createPersonalTaskOnBackend(
  task: PersonalTaskPayload
): Promise<PersonalTaskPayload | null> {
  try {
    const json = await httpClient.post<SinglePersonalTaskResponse>('/admin/users/me/tasks', task, {
      timeoutMs: 4000,
    });
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Update an existing personal task on the backend
 */
export async function updatePersonalTaskOnBackend(
  id: string,
  updates: Partial<PersonalTaskPayload>
): Promise<boolean> {
  try {
    await httpClient.put<unknown>(`/admin/users/me/tasks/${encodeURIComponent(id)}`, updates, {
      timeoutMs: 4000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a personal task on the backend
 */
export async function deletePersonalTaskOnBackend(id: string): Promise<boolean> {
  try {
    await httpClient.delete<unknown>(`/admin/users/me/tasks/${encodeURIComponent(id)}`, {
      timeoutMs: 4000,
    });
    return true;
  } catch {
    return false;
  }
}
