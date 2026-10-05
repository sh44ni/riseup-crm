import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  usePersonalTasks,
  TaskPriority,
  WorkCategory,
  PRIORITY_OPTIONS,
  PRIORITY_THEMES,
  formatDueDate,
  PersonalTask,
  useUserCustomCategories,
  getCategoryStyle,
} from '@/lib/personalTasksStore';
import { useAuth } from '@/context/AuthContext';
import { CreatePersonalTaskModal } from './CreatePersonalTaskModal';
import { PersonalTaskDetailModal } from './PersonalTaskDetailModal';

export function SidebarTasksWidget() {
  const {
    tasks,
    completedCount,
    progressPercent,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  } = usePersonalTasks();

  const { user } = useAuth();
  const { categories: userCategories } = useUserCustomCategories(user?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<PersonalTask | null>(null);

  const visibleTasks = tasks.slice(0, 2);

  return (
    <>
      <div className="relative z-10 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs p-3 space-y-2 select-none group/tasks hover:border-sky-300 dark:hover:border-sky-500/30 transition-all">
        {/* ========================================================
            1. HEADER: Title, Count, Progress Summary & Tasks Link
            ======================================================== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 leading-none">
            <h3 className="text-xs font-bold text-[#1F1F1F] dark:text-white">Tasks</h3>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-white/10 shadow-2xs">
              {tasks.length}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-400 font-medium ml-1">
              • {completedCount}/{tasks.length} done
            </span>
          </div>

          <Link
            to="/tasks?tab=personal_notes"
            className="text-[9.5px] font-bold text-[#0284c7] hover:text-[#0369a1] dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-0.5 group transition-colors"
          >
            <span>Tasks</span>
            <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ========================================================
            2. STICKY NOTE CARDS (Authentic Pastel Tint & Aligned Badges)
            ======================================================== */}
        <div className="space-y-1.5 pt-0.5">
          {tasks.length === 0 ? (
            <div className="text-center py-2.5 px-2 rounded-xl bg-white/40 dark:bg-slate-900/50 border border-white/60 dark:border-white/10">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">No sticky notes yet</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-1 text-[9.5px] font-bold text-[#0284c7] dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={10} /> Add sticky note
              </button>
            </div>
          ) : (
            visibleTasks.map((task) => {
              const currentPriority =
                PRIORITY_OPTIONS.find((p) => p.id === task.priority) || PRIORITY_OPTIONS[2];
              const currentCategoryStyle = getCategoryStyle(task.workCategory, userCategories);
              const theme = PRIORITY_THEMES[task.priority] || PRIORITY_THEMES['normal'];
              const formattedDue = formatDueDate(task.dueDate);

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskForDetail(task)}
                  className={`group relative p-2 pl-3 rounded-xl transition-all border cursor-pointer ${
                    task.completed
                      ? 'bg-white/40 dark:bg-slate-900/40 border-slate-200/70 dark:border-white/10 opacity-70 backdrop-blur-xs'
                      : `${theme.bg} ${theme.border} ${theme.hoverBorder} shadow-2xs hover:shadow-xs`
                  }`}
                >
                  {/* Left colored priority accent stripe */}
                  <div
                    className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-colors ${
                      task.completed ? 'bg-slate-300 dark:bg-slate-600' : theme.stripe
                    }`}
                  />

                  <div className="flex items-start gap-2 min-w-0">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                      className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-[#0284c7] bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {task.completed && <Check size={9} className="stroke-[3]" />}
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Title */}
                      <div
                        className={`text-[10.5px] font-bold leading-tight truncate ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : `${theme.title} group-hover:opacity-80`
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>

                      {/* Badges Row: category, priority, date */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category badge */}
                        {task.workCategory && task.workCategory.trim() && (
                          <span
                            className={`inline-flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-2xs leading-none ${currentCategoryStyle.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${currentCategoryStyle.dotClass}`} />
                            {task.workCategory}
                          </span>
                        )}

                        {/* Priority badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[7.5px] font-bold px-1.5 py-0.5 rounded border shadow-2xs leading-none ${currentPriority.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${currentPriority.dotClass}`} />
                          {currentPriority.label}
                        </span>

                        {/* Due date */}
                        {formattedDue && (
                          <span className="inline-flex items-center gap-0.5 text-[7.5px] font-bold px-1.5 py-0.5 rounded border bg-white/80 dark:bg-slate-800 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs leading-none">
                            📅 {formattedDue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================
            3. ADD TASK BUTTON
            ======================================================== */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full py-1.5 px-3 rounded-xl liquid-glass-btn text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#0284c7] dark:hover:text-sky-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
        >
          <Plus size={11} className="text-slate-400 group-hover:text-[#0284c7] transition-colors" />
          <span>Add Task</span>
        </button>
      </div>

      {/* ========================================================
          5. NEW STICKY NOTE MODAL POPUP
          ======================================================== */}
      {isModalOpen && (
        <CreatePersonalTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTask={addTask}
        />
      )}

      {/* ========================================================
          6. STICKY NOTE DETAIL / INSPECTOR MODAL POPUP
          ======================================================== */}
      {Boolean(selectedTaskForDetail) && (
        <PersonalTaskDetailModal
          task={selectedTaskForDetail}
          isOpen={Boolean(selectedTaskForDetail)}
          onClose={() => setSelectedTaskForDetail(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onToggle={toggleTask}
        />
      )}
    </>
  );
}
