import React from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ArrowRight,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CrmTask, TaskPriority } from '@/types/taskTypes';
import { PRIORITY_CONFIG, CATEGORY_BADGES } from '@/data/taskData';

interface TasksSectionListProps {
  tasks: CrmTask[];
  onToggleTask: (id: string) => void;
  onSelectTask?: (task: CrmTask) => void;
}

export function TasksSectionList({
  tasks,
  onToggleTask,
  onSelectTask,
}: TasksSectionListProps) {
  // Segregate into 3 sections strictly matching the user's mockup:
  // 1. Today's active / follow-up tasks
  // 2. Upcoming schedule tasks
  // 3. Completed tasks
  const todayTasks = tasks.filter((t) => t.status === 'active' && t.isToday);
  const upcomingTasks = tasks.filter((t) => t.status === 'active' && !t.isToday);
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const renderTaskCard = (task: CrmTask, isCompleted = false) => {
    const pConfig = PRIORITY_CONFIG[task.priority];
    const catConfig = CATEGORY_BADGES[task.category] || CATEGORY_BADGES.general;

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask?.(task)}
        className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 group cursor-pointer ${
          isCompleted
            ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-white/5 opacity-70 hover:opacity-100'
            : 'bg-white/95 dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500 shadow-2xs hover:shadow-xs'
        }`}
      >
        {/* Checkbox Matching Mockup */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTask(task.id);
          }}
          title={isCompleted ? 'Mark Active' : 'Mark Completed'}
          className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
            isCompleted
              ? 'bg-[#1878B8] border-[#1878B8] text-white shadow-2xs'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-sky-400 group-hover:scale-105'
          }`}
        >
          {isCompleted && (
            <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[3]" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header Line: Title + Priority + Category */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-black text-sm text-slate-900 dark:text-white leading-snug hover:text-[#0284c7] dark:hover:text-sky-400 transition-colors ${
                isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''
              }`}
            >
              {task.title}
            </span>

            {/* Priority Pill Matching Mockup */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${pConfig.bgClass} ${pConfig.borderClass} ${pConfig.textClass}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: pConfig.dotColor }}
              />
              <span>{pConfig.label}</span>
            </span>

            {/* Category Pill Matching Mockup */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catConfig.pillClass}`}
            >
              {catConfig.label}
            </span>

            {/* Linked Estimate Badge if applicable */}
            {task.estimateAmount && (
              <Link
                to="/estimates"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs"
              >
                <FileText size={10} className="text-amber-600 dark:text-amber-400" />
                <span>${task.estimateAmount.toLocaleString()} Estimate</span>
                <ExternalLink size={9} />
              </Link>
            )}
          </div>

          {/* Description / Sample Text Matching Mockup */}
          {task.description && (
            <p className={`text-xs ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
              {task.description}
            </p>
          )}

          {/* Bottom Meta: Due Date & Assignee Matching Mockup */}
          <div className="flex items-center gap-3 pt-1 text-[11px] flex-wrap">
            {/* Due Date */}
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium font-mono">
              <Clock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{task.dueDateFormatted}</span>
            </div>

            {/* Assignee Chip Matching Mockup (⚠️ Unassigned or Assigned roofer) */}
            {task.assignedTo === 'Unassigned' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-bold shadow-2xs">
                <AlertTriangle size={10} className="text-amber-600 dark:text-amber-400" />
                <span>Unassigned</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[10px] font-bold shadow-2xs">
                <span className="w-3.5 h-3.5 rounded-full bg-[#1878B8] text-white flex items-center justify-center text-[8px] font-black">
                  {task.assignedInitials || task.assignedTo.slice(0, 1)}
                </span>
                <span>{task.assignedTo}</span>
              </span>
            )}

            {isCompleted && task.completedAt && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold ml-auto">
                Completed {task.completedAt}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================
          1. TODAY'S FOLLOW-UPS & ACTIVE (0)
          ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-2xs p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
          <Clock size={14} className="text-amber-600 stroke-[2.5]" />
          <span>Today's Follow-ups &amp; Active ({todayTasks.length})</span>
        </div>

        {todayTasks.length === 0 ? (
          <div className="p-3 text-xs text-slate-400 dark:text-slate-500 italic">
            All set for today! No pending operations due.
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((t) => renderTaskCard(t, false))}
          </div>
        )}
      </div>

      {/* ========================================================
          2. UPCOMING SCHEDULE (1)
          ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-2xs p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
          <Calendar size={14} className="text-sky-600 stroke-[2.5]" />
          <span>Upcoming Schedule ({upcomingTasks.length})</span>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="p-3 text-xs text-slate-400 dark:text-slate-500 italic">
            No upcoming tasks scheduled.
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingTasks.map((t) => renderTaskCard(t, false))}
          </div>
        )}
      </div>

      {/* ========================================================
          3. COMPLETED (6)
          ======================================================== */}
      <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-2xs p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
          <CheckCircle2 size={14} className="text-emerald-600 stroke-[2.5]" />
          <span>Completed ({completedTasks.length})</span>
        </div>

        {completedTasks.length === 0 ? (
          <div className="p-3 text-xs text-slate-400 dark:text-slate-500 italic">
            No completed tasks archived yet.
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((t) => renderTaskCard(t, true))}
          </div>
        )}
      </div>
    </div>
  );
}
