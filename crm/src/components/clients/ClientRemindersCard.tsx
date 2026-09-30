import React, { useState } from 'react';
import { Calendar, CheckSquare, Plus, ChevronRight, Check, Flame, Clock } from 'lucide-react';
import { ClientTask } from '@/types/client360Types';

interface ClientRemindersCardProps {
  tasks: ClientTask[];
  onToggleTask?: (taskId: string) => void;
  onAddTask?: () => void;
  onViewAllTasks?: () => void;
}

export function ClientRemindersCard({
  tasks,
  onToggleTask,
  onAddTask,
  onViewAllTasks,
}: ClientRemindersCardProps) {
  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="light-glass-card rounded-2xl p-5">
      {/* Header matching mockup */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Calendar size={16} />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
            Next Follow-ups & Reminders
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAddTask}
            className="text-xs font-semibold text-[#0284C7] dark:text-sky-400 hover:text-[#0369a1] dark:hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </button>

          <button
            onClick={onViewAllTasks}
            className="text-xs font-semibold text-[#0284C7] dark:text-sky-400 hover:text-[#0369a1] dark:hover:text-sky-300 transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>All Tasks ({pendingCount})</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Task List or Empty State (Exact Mockup) */}
      <div className="mt-3">
        {tasks.length === 0 ? (
          <div className="py-4 text-xs italic text-slate-400 dark:text-slate-500">
            No pending tasks for this client. You're all caught up!
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  task.completed
                    ? 'bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 line-through'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleTask?.(task.id)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-white/20 hover:border-[#0284C7] dark:hover:border-sky-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {task.completed && <Check size={12} />}
                  </button>

                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{task.title}</span>
                      {task.isWinBackTask && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                          <Flame size={10} className="text-amber-600 dark:text-amber-400" />
                          Win-Back Touchpoint
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Due: <strong className="text-slate-600 dark:text-slate-300">{task.dueDate}</strong>
                      </span>
                      <span>•</span>
                      <span>Assigned to: {task.assignedTo}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                    task.priority === 'high'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10'
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
