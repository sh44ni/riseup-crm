import { useMemo, useCallback } from 'react';
import {
  PersonalTaskPayload,
  TaskPriority,
  WorkCategory,
} from '@/api/personalTasksApi';
import {
  usePersonalTasksQuery,
} from '@/entities/task/queries';
import {
  useCreatePersonalTaskMutation,
  useUpdatePersonalTaskMutation,
  useDeletePersonalTaskMutation,
} from '@/entities/task/mutations';

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
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    }
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return dueDate;
  }
}

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export function sortTasksByPriority(tasks: PersonalTaskPayload[]): PersonalTaskPayload[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const aPinned = a.isPinned || (a.sortOrder !== undefined && a.sortOrder < 0);
    const bPinned = b.isPinned || (b.sortOrder !== undefined && b.sortOrder < 0);
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }
    const weightA = PRIORITY_WEIGHTS[a.priority] || 3;
    const weightB = PRIORITY_WEIGHTS[b.priority] || 3;
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Modernized TanStack Query backed hook for personal to-dos and reminders.
 */
export function usePersonalTasks() {
  const { data: rawTasks = [], refetch } = usePersonalTasksQuery();
  const createMutation = useCreatePersonalTaskMutation();
  const updateMutation = useUpdatePersonalTaskMutation();
  const deleteMutation = useDeletePersonalTaskMutation();

  const tasks = useMemo(() => {
    return sortTasksByPriority(rawTasks || []);
  }, [rawTasks]);

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const activeCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const progressPercent = useMemo(
    () => (tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0),
    [tasks.length, completedCount]
  );

  const refreshTasks = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const addTask = useCallback(
    async (taskData: Omit<PersonalTaskPayload, 'id' | 'createdAt'>) => {
      const tempId = `task-${Date.now()}`;
      const newTask: PersonalTaskPayload = {
        ...taskData,
        id: tempId,
        createdAt: new Date().toISOString(),
      };
      const result = await createMutation.mutateAsync(newTask);
      return result || newTask;
    },
    [createMutation]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<PersonalTaskPayload>) => {
      await updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      await updateMutation.mutateAsync({
        id,
        updates: { completed: !task.completed },
      });
    },
    [tasks, updateMutation]
  );

  const togglePinTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const nextPinned = !task.isPinned && (task.sortOrder === undefined || task.sortOrder >= 0);
      const nextSortOrder = nextPinned ? -100 : 0;
      await updateMutation.mutateAsync({
        id,
        updates: { isPinned: nextPinned, sortOrder: nextSortOrder },
      });
    },
    [tasks, updateMutation]
  );

  const setTaskPriority = useCallback(
    async (id: string, priority: TaskPriority) => {
      await updateTask(id, { priority });
    },
    [updateTask]
  );

  const setTaskWorkCategory = useCallback(
    async (id: string, workCategory: WorkCategory) => {
      await updateTask(id, { workCategory });
    },
    [updateTask]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
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
