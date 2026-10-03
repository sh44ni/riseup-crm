import {
  TaskPriority,
  PriorityMeta,
  TaskCategory,
} from '@/types/taskTypes';

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityMeta> = {
  urgent: {
    label: 'Urgent',
    bgClass: 'bg-rose-50 dark:bg-rose-950/50',
    borderClass: 'border-rose-200/90 dark:border-rose-800/60',
    textClass: 'text-rose-700 dark:text-rose-300',
    dotColor: '#e11d48',
  },
  high: {
    label: 'High',
    bgClass: 'bg-amber-50 dark:bg-amber-950/50',
    borderClass: 'border-amber-200/90 dark:border-amber-800/60',
    textClass: 'text-amber-800 dark:text-amber-300',
    dotColor: '#d97706',
  },
  normal: {
    label: 'Normal',
    bgClass: 'bg-sky-50 dark:bg-sky-950/50',
    borderClass: 'border-sky-200/90 dark:border-sky-800/60',
    textClass: 'text-[#0284c7] dark:text-sky-400',
    dotColor: '#0284c7',
  },
  low: {
    label: 'Low',
    bgClass: 'bg-slate-50 dark:bg-slate-800/50',
    borderClass: 'border-slate-200/90 dark:border-slate-700',
    textClass: 'text-slate-600 dark:text-slate-400',
    dotColor: '#64748b',
  },
};

export const CATEGORY_BADGES: Record<TaskCategory, { label: string; pillClass: string }> = {
  rise_up: {
    label: 'Rise Up',
    pillClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
  },
  estimate_followup: {
    label: 'Estimate Follow-up',
    pillClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
  },
  permits_city: {
    label: 'City Permits',
    pillClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
  },
  content_creation: {
    label: 'Content Creation',
    pillClass: 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200/80 dark:border-pink-800/60',
  },
  marketing: {
    label: 'Marketing',
    pillClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
  },
  general: {
    label: 'General',
    pillClass: 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
  },
};
