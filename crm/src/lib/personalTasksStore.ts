import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PersonalTaskPayload,
  TaskPriority,
  WorkCategory,
  fetchPersonalTasksFromBackend,
  createPersonalTaskOnBackend,
  updatePersonalTaskOnBackend,
  deletePersonalTaskOnBackend,
} from '@/api/personalTasksApi';

export type { TaskPriority, WorkCategory, PersonalTaskPayload as PersonalTask };

export interface PriorityConfig {
  id: TaskPriority;
  label: string;
  colorName: string;
  badgeClass: string;
  dotClass: string;
}

export const PRIORITY_OPTIONS: PriorityConfig[] = [
  {
    id: 'urgent',
    label: 'Urgent',
    colorName: 'Red',
    badgeClass: 'bg-rose-50/95 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/50',
    dotClass: 'bg-rose-500',
  },
  {
    id: 'high',
    label: 'High',
    colorName: 'Yellow',
    badgeClass: 'bg-amber-50/95 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/50',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'normal',
    label: 'Normal',
    colorName: 'Blue',
    badgeClass: 'bg-sky-50/95 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/50',
    dotClass: 'bg-sky-500',
  },
  {
    id: 'low',
    label: 'Low',
    colorName: 'Gray',
    badgeClass: 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10',
    dotClass: 'bg-slate-400',
  },
];

export interface CategoryConfig {
  id: WorkCategory;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export interface StickyThemeConfig {
  bg: string;
  border: string;
  hoverBorder: string;
  stripe: string;
  title: string;
  accent: string;
}

export const STICKY_THEMES: Record<WorkCategory, StickyThemeConfig> = {
  'Rise Up': {
    bg: 'bg-sky-50/90 dark:bg-sky-950/30',
    border: 'border-sky-200/90 dark:border-sky-800/40',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
    stripe: 'bg-[#0284c7]',
    title: 'text-sky-950 dark:text-sky-200',
    accent: '#0284c7',
  },
  'Content Creation': {
    bg: 'bg-purple-50/90 dark:bg-purple-950/30',
    border: 'border-purple-200/90 dark:border-purple-800/40',
    hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600',
    stripe: 'bg-[#7c3aed]',
    title: 'text-purple-950 dark:text-purple-200',
    accent: '#7c3aed',
  },
  'Marketing': {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/30',
    border: 'border-emerald-200/90 dark:border-emerald-800/40',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    stripe: 'bg-[#059669]',
    title: 'text-emerald-950 dark:text-emerald-200',
    accent: '#059669',
  },
};

export const WORK_CATEGORIES: CategoryConfig[] = [
  {
    id: 'Rise Up',
    label: 'Rise Up',
    badgeClass: 'bg-sky-50/90 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-400 border-sky-200/80 dark:border-sky-800/50',
    dotClass: 'bg-[#0284c7]',
  },
  {
    id: 'Content Creation',
    label: 'Content Creation',
    badgeClass: 'bg-purple-50/90 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50',
    dotClass: 'bg-purple-500',
  },
  {
    id: 'Marketing',
    label: 'Marketing',
    badgeClass: 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50',
    dotClass: 'bg-emerald-500',
  },
];

/** Priority-based card color themes — used instead of category themes */
export const PRIORITY_THEMES: Record<TaskPriority, StickyThemeConfig> = {
  urgent: {
    bg: 'bg-rose-50/90 dark:bg-rose-950/30',
    border: 'border-rose-200/90 dark:border-rose-800/40',
    hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
    stripe: 'bg-rose-500',
    title: 'text-rose-950 dark:text-rose-200',
    accent: '#e11d48',
  },
  high: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/30',
    border: 'border-amber-200/90 dark:border-amber-800/40',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    stripe: 'bg-amber-500',
    title: 'text-amber-950 dark:text-amber-200',
    accent: '#f59e0b',
  },
  normal: {
    bg: 'bg-sky-50/90 dark:bg-sky-950/30',
    border: 'border-sky-200/90 dark:border-sky-800/40',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
    stripe: 'bg-sky-500',
    title: 'text-sky-950 dark:text-sky-200',
    accent: '#0284c7',
  },
  low: {
    bg: 'bg-slate-50/90 dark:bg-slate-900/40',
    border: 'border-slate-200/80 dark:border-white/10',
    hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-600',
    stripe: 'bg-slate-400',
    title: 'text-slate-700 dark:text-slate-300',
    accent: '#94a3b8',
  },
};

/** Format a dueDate string (ISO or legacy "Today"/"Tomorrow") to a human-readable date+time */
export function formatDueDate(dueDate: string | undefined | null): string | null {
  if (!dueDate) return null;
  if (dueDate === 'Today') {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (dueDate === 'Tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  try {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return dueDate;
    // If time is midnight, show date only
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
    }
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return dueDate;
  }
}

export const INITIAL_PERSONAL_TASKS: PersonalTaskPayload[] = [
  {
    id: 'task-init-1',
    title: 'Submit Carlsbad City Sheathing & Flashing Nail Permit',
    workCategory: 'Rise Up',
    priority: 'urgent',
    completed: false,
    dueDate: new Date().toISOString(),
    sortOrder: 0,
    notes: 'Upload architectural plan revision to City of Carlsbad online portal before 4 PM cutoff.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-init-2',
    title: 'Follow-up on $24,850 Duration Shingles Proposal',
    workCategory: 'Rise Up',
    priority: 'high',
    completed: false,
    dueDate: new Date().toISOString(),
    sortOrder: 0,
    notes: 'Review Good / Better / Best options and check if homeowner wants 120-mo financing walkthrough.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-init-3',
    title: 'Drone 4K Roof Audit Report Delivery',
    workCategory: 'Content Creation',
    priority: 'normal',
    completed: false,
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString(); })(),
    sortOrder: 0,
    notes: 'Sent PDF inspection certificate to homeowner via email.',
    createdAt: new Date().toISOString(),
  },
];

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export function sortTasksByPriority(tasks: PersonalTaskPayload[]): PersonalTaskPayload[] {
  return [...tasks].sort((a, b) => {
    // 1. Incomplete first, completed last
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 2. Pinned items first
    const aPinned = a.isPinned || (a.sortOrder !== undefined && a.sortOrder < 0);
    const bPinned = b.isPinned || (b.sortOrder !== undefined && b.sortOrder < 0);
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }
    // 3. Priority order (urgent: 1, high: 2, normal: 3, low: 4)
    const weightA = PRIORITY_WEIGHTS[a.priority] || 3;
    const weightB = PRIORITY_WEIGHTS[b.priority] || 3;
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    // 4. Date created descending (newest first)
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

const STORAGE_KEY = 'crm_personal_sticky_notes';
const SYNC_EVENT_NAME = 'crm_personal_tasks_change';

/** IDs of the built-in demo tasks — cleared on first load so they never show again */
const MOCK_TASK_IDS = new Set(['task-init-1', 'task-init-2', 'task-init-3']);

/**
 * Load personal tasks from local storage. Returns empty array if none saved.
 */
export function loadPersonalTasks(): PersonalTaskPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strip out any old mock/demo tasks that were seeded previously
    const real = parsed.filter((t: PersonalTaskPayload) => !MOCK_TASK_IDS.has(t.id));
    if (real.length !== parsed.length) {
      // Persist cleaned list back to storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(real));
    }
    return real.length > 0 ? sortTasksByPriority(real) : [];
  } catch (err) {
    console.error('Failed to parse personal tasks from storage:', err);
    return [];
  }
}

/**
 * Save personal tasks to local storage and trigger sync event
 */
export function savePersonalTasks(tasks: PersonalTaskPayload[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = sortTasksByPriority(tasks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: sorted }));
  } catch (err) {
    console.error('Failed to save personal tasks to storage:', err);
  }
}

/**
 * React hook for managing individual to-dos and reminders
 */
export function usePersonalTasks() {
  const [tasks, setTasks] = useState<PersonalTaskPayload[]>(loadPersonalTasks);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setTasks(sortTasksByPriority(parsed));
        } catch {
          // Ignore parse errors
        }
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && Array.isArray(detail)) {
        setTasks(sortTasksByPriority(detail));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    };
  }, []);

  // Backend background revalidation on mount and window focus
  useEffect(() => {
    let isMounted = true;
    const loadFromBackend = () => {
      fetchPersonalTasksFromBackend().then((backendTasks) => {
        // null = network/auth error (keep local); array = source of truth (even if empty)
        if (backendTasks !== null && isMounted) {
          const sorted = sortTasksByPriority(backendTasks);
          setTasks(sorted);
          savePersonalTasks(sorted);
        }
      });
    };

    loadFromBackend();
    window.addEventListener('focus', loadFromBackend);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', loadFromBackend);
    };
  }, []);

  // Metrics
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const activeCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const progressPercent = useMemo(
    () => (tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0),
    [tasks.length, completedCount]
  );

  const refreshTasks = useCallback(async () => {
    const backendTasks = await fetchPersonalTasksFromBackend();
    if (backendTasks !== null && backendTasks.length > 0) {
      const sorted = sortTasksByPriority(backendTasks);
      setTasks(sorted);
      savePersonalTasks(sorted);
    }
  }, []);

  // Add task
  const addTask = useCallback(
    async (taskData: Omit<PersonalTaskPayload, 'id' | 'createdAt'>) => {
      const tempId = `task-${Date.now()}`;
      const newTask: PersonalTaskPayload = {
        ...taskData,
        id: tempId,
        createdAt: new Date().toISOString(),
      };

      // Optimistic add with temp ID
      setTasks((prev) => {
        const updated = sortTasksByPriority([newTask, ...prev]);
        savePersonalTasks(updated);
        return updated;
      });

      // Save to backend — swap temp ID with backend-confirmed task
      const backendTask = await createPersonalTaskOnBackend(newTask);
      if (backendTask) {
        setTasks((prev) => {
          // Replace the optimistic entry with the backend-confirmed one (handles ID changes)
          const updated = sortTasksByPriority(
            prev.map((t) => (t.id === tempId ? { ...t, ...backendTask } : t))
          );
          savePersonalTasks(updated);
          return updated;
        });
        return backendTask;
      }
      return newTask;
    },
    []
  );

  // Update task
  const updateTask = useCallback(
    async (id: string, updates: Partial<PersonalTaskPayload>) => {
      setTasks((prev) => {
        const updated = sortTasksByPriority(
          prev.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          )
        );
        savePersonalTasks(updated);
        return updated;
      });

      await updatePersonalTaskOnBackend(id, updates);
    },
    []
  );

  // Toggle completion
  const toggleTask = useCallback(
    async (id: string) => {
      let nextStatus = false;
      setTasks((prev) => {
        const updated = sortTasksByPriority(
          prev.map((t) => {
            if (t.id === id) {
              nextStatus = !t.completed;
              return {
                ...t,
                completed: nextStatus,
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          })
        );
        savePersonalTasks(updated);
        return updated;
      });

      await updatePersonalTaskOnBackend(id, { completed: nextStatus });
    },
    []
  );

  // Toggle pin
  const togglePinTask = useCallback(
    async (id: string) => {
      let nextPinned = false;
      let nextSortOrder = 0;
      setTasks((prev) => {
        const updated = sortTasksByPriority(
          prev.map((t) => {
            if (t.id === id) {
              nextPinned = !t.isPinned && (t.sortOrder === undefined || t.sortOrder >= 0);
              nextSortOrder = nextPinned ? -100 : 0;
              return {
                ...t,
                isPinned: nextPinned,
                sortOrder: nextSortOrder,
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          })
        );
        savePersonalTasks(updated);
        return updated;
      });

      await updatePersonalTaskOnBackend(id, { sortOrder: nextSortOrder });
    },
    []
  );

  // Change priority directly
  const setTaskPriority = useCallback(
    async (id: string, priority: TaskPriority) => {
      await updateTask(id, { priority });
    },
    [updateTask]
  );

  // Change work category directly
  const setTaskWorkCategory = useCallback(
    async (id: string, workCategory: WorkCategory) => {
      await updateTask(id, { workCategory });
    },
    [updateTask]
  );

  // Delete task
  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        savePersonalTasks(updated);
        return updated;
      });

      await deletePersonalTaskOnBackend(id);
    },
    []
  );

  return {
    tasks,
    completedCount,
    activeCount,
    progressPercent,
    refreshTasks,
    addTask,
    updateTask,
    toggleTask,
    togglePinTask,
    setTaskPriority,
    setTaskWorkCategory,
    deleteTask,
  };
}
