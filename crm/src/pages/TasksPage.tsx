import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, CheckCircle2, FileText, CheckSquare, Sparkles, AlertCircle } from 'lucide-react';
import { CrmPageHero } from '@/components/common/CrmPageHero';
import { TasksKpiCards } from '@/components/tasks/TasksKpiCards';
import { TasksFilterBar } from '@/components/tasks/TasksFilterBar';
import { TasksSectionList } from '@/components/tasks/TasksSectionList';
import { PersonalStickyBoard } from '@/components/tasks/PersonalStickyBoard';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CrmTaskDetailModal } from '@/components/tasks/CrmTaskDetailModal';
import { CrmTask, TaskCategory, TaskStatus } from '@/types/taskTypes';
import { usePersonalTasks } from '@/lib/personalTasksStore';
import { api } from '@/lib/api';
import { useOperationsTasksQuery } from '@/entities/task/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useDebounce } from '@/hooks/useDebounce';
import { TaskItemsSkeleton } from '@/components/common/Skeletons';

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'operations' | 'personal_notes'>(
    tabFromUrl === 'operations' ? 'operations' : 'personal_notes'
  );

  useEffect(() => {
    if (tabFromUrl === 'operations') {
      setActiveTab('operations');
    } else if (tabFromUrl === 'personal_notes' || tabFromUrl === 'personal') {
      setActiveTab('personal_notes');
    }
  }, [tabFromUrl]);

  const handleTabChange = useCallback((newTab: 'operations' | 'personal_notes') => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  }, [setSearchParams]);

  // Tasks TanStack Query cache
  const { data: rawTasks, isLoading: isTasksQueryLoading, refetch: refetchOperationsTasks } = useOperationsTasksQuery();
  const [localTasks, setLocalTasks] = useState<CrmTask[] | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<'all' | TaskCategory>('all');
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search, 200);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<CrmTask | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Derive mapped tasks from query data
  const backendTasks = useMemo<CrmTask[]>(() => {
    if (!rawTasks) return [];
    const now = new Date();
    return rawTasks.map((t: any) => {
      const due = t.due_at ? new Date(t.due_at) : new Date();
      const isOverdue = due < now && !t.completed_at;
      const isToday = due.toDateString() === now.toDateString();
      const assignee = t.assigned_user_name || t.assigned_to || 'Unassigned';
      const initials =
        assignee !== 'Unassigned'
          ? assignee
              .split(' ')
              .map((p: string) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : undefined;

      return {
        id: String(t.id),
        title: t.title,
        clientName: t.lead_name || t.job_customer_name || t.customer_name || (t.assigned_to !== assignee ? t.assigned_to : undefined),
        description: t.description || undefined,
        category: (t.event_type || t.category || 'general') as TaskCategory,
        priority: (t.priority || 'normal') as any,
        status: (t.completed_at ? 'completed' : 'active') as TaskStatus,
        dueDate: t.due_at || new Date().toISOString(),
        dueDateFormatted:
          due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
          ` at ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        isOverdue,
        isToday,
        isUpcoming: !isOverdue && !isToday,
        assignedTo: assignee,
        assignedToUserId: t.assigned_to_user_id ? Number(t.assigned_to_user_id) : undefined,
        assignedInitials: initials,
        completedAt: t.completed_at || undefined,
        entityType: t.entity_type || undefined,
        entityId: t.entity_id ? Number(t.entity_id) : undefined,
      };
    });
  }, [rawTasks]);

  // Sync backend data into localTasks
  useEffect(() => {
    setLocalTasks(backendTasks);
  }, [backendTasks]);

  const tasks = localTasks ?? backendTasks;
  const isLoadingTasks = isTasksQueryLoading && !rawTasks;

  // Live Personal Tasks Store (synchronized 2-way with Dashboard right-dock widget)
  const {
    tasks: personalTasks,
    completedCount: personalCompletedCount,
    activeCount: personalActiveCount,
    progressPercent: personalProgressPercent,
    refreshTasks: refreshPersonalTasks,
    addTask: addPersonalTask,
    updateTask: updatePersonalTask,
    toggleTask: togglePersonalTask,
    togglePinTask,
    deleteTask: deletePersonalTask,
  } = usePersonalTasks();

  // Global keyboard shortcut: ⌘ / Win + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search tasks"]') as HTMLInputElement;
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter team operations tasks
  const filteredTasks = useMemo(() => {
    let list = tasks;

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.clientName && t.clientName.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.assignedTo.toLowerCase().includes(q)
      );
    }

    return list;
  }, [tasks, selectedCategory, debouncedSearch]);

  // Operational KPI counts
  const opOverdueCount = useMemo(() => tasks.filter((t) => t.status === 'active' && t.isOverdue).length, [tasks]);
  const opDueTodayCount = useMemo(() => tasks.filter((t) => t.status === 'active' && t.isToday).length, [tasks]);
  const opUpcomingCount = useMemo(() => tasks.filter((t) => t.status === 'active' && !t.isToday && !t.isOverdue).length, [tasks]);
  const opCompletedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const activeTasksCount = useMemo(() => tasks.filter((t) => t.status === 'active').length, [tasks]);

  // Dynamic SLA On-Time Follow-up calculation based on actual completed vs overdue tasks
  const slaPercentage = useMemo(() => {
    const totalOps = opOverdueCount + opDueTodayCount + opUpcomingCount + opCompletedCount;
    if (totalOps === 0) return 100;
    const evaluated = opCompletedCount + opOverdueCount;
    if (evaluated === 0) {
      // If no overdue and no completed yet, SLA is 100% on schedule
      return opOverdueCount === 0 ? 100 : Math.max(0, Math.round(((totalOps - opOverdueCount) / totalOps) * 100));
    }
    return Math.max(0, Math.round((opCompletedCount / evaluated) * 100));
  }, [opOverdueCount, opDueTodayCount, opUpcomingCount, opCompletedCount]);

  // Personal KPI counts
  const persOverdueCount = useMemo(
    () => personalTasks.filter((t) => !t.completed && t.priority === 'urgent').length,
    [personalTasks]
  );
  const persDueTodayCount = useMemo(
    () => personalTasks.filter((t) => !t.completed && (t.dueDate === 'Today' || !t.dueDate)).length,
    [personalTasks]
  );
  const persUpcomingCount = useMemo(
    () => personalTasks.filter((t) => !t.completed && t.dueDate && t.dueDate !== 'Today').length,
    [personalTasks]
  );

  // Active KPI counts (context-aware: switches based on active tab)
  const overdueCount = activeTab === 'personal_notes' ? persOverdueCount : opOverdueCount;
  const dueTodayCount = activeTab === 'personal_notes' ? persDueTodayCount : opDueTodayCount;
  const upcomingCount = activeTab === 'personal_notes' ? persUpcomingCount : opUpcomingCount;
  const completedCount = activeTab === 'personal_notes' ? personalCompletedCount : opCompletedCount;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.filter((t) => t.status === 'active').length };
    tasks
      .filter((t) => t.status === 'active')
      .forEach((t) => {
        counts[t.category] = (counts[t.category] || 0) + 1;
      });
    return counts;
  }, [tasks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchOperationsTasks(), refreshPersonalTasks()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleTask = async (id: string) => {
    let nextStatus: 'active' | 'completed' = 'completed';
    setLocalTasks((prev) =>
      (prev ?? tasks).map((t) => {
        if (t.id === id) {
          nextStatus = t.status === 'completed' ? 'active' : 'completed';
          return {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? 'Just now' : undefined,
          };
        }
        return t;
      })
    );

    try {
      await api.updateTask({ id, completed: nextStatus === 'completed' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
    } catch (err) {
      console.error('Failed to toggle task completion on backend:', err);
      refetchOperationsTasks();
    }
  };

  const handleAddTask = async (newTask: CrmTask) => {
    try {
      const res = await api.createTask({
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedToUserId: newTask.assignedToUserId,
        dueAt: newTask.dueDate,
        priority: newTask.priority,
        eventType: newTask.category,
        category: newTask.category,
        entityType: newTask.entityType,
        entityId: newTask.entityId,
      });
      const createdId = res?.task?.id ? String(res.task.id) : res?.data?.id ? String(res.data.id) : newTask.id;
      setLocalTasks((prev) => [{ ...newTask, id: createdId }, ...(prev ?? tasks)]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
    } catch (err) {
      console.error('Failed to create task on backend:', err);
      setLocalTasks((prev) => [newTask, ...(prev ?? tasks)]);
    }
  };

  const handleUpdateTask = async (updated: CrmTask) => {
    setLocalTasks((prev) => (prev ?? tasks).map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(null);

    try {
      await api.updateTask({
        id: updated.id,
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        category: updated.category,
        dueDate: updated.dueDate,
        dueAt: updated.dueDate,
        assignedTo: updated.assignedTo,
        assignedToUserId: updated.assignedToUserId,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
    } catch (err) {
      console.error('Failed to update task on backend:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setLocalTasks((prev) => (prev ?? tasks).filter((t) => t.id !== taskId));
    setSelectedTask(null);
    try {
      await api.deleteTask(taskId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
    } catch (err) {
      console.error('Failed to delete task on backend:', err);
    }
  };

  return (
    <div className="space-y-4 w-full select-none pb-20 relative">
      {/* 1. Unified 220px Hero Banner with Dynamic SLA Badge & Top Search */}
      <CrmPageHero
        pageId="tasks"
        defaultEyebrow="Action Items & Workflow SLA • Oceanside HQ"
        defaultTitle="DAILY TASKS & EXPEDITED ACTIONS"
        defaultSubtitle="Follow-up reminders, drone inspection dispatches, material order sign-offs, and SLA tracking."
        showSearch={true}
        searchPlaceholder="Search tasks, assignees, leads, addresses..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        topRightActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white font-bold text-xs shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>New Task</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh tasks"
              className="w-9 h-9 rounded-xl liquid-glass-btn flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-sky-400 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw
                size={14}
                className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`}
              />
            </button>
          </div>
        }
        bottomRightBadges={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs shrink-0">
              <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
              <span>SLA: {slaPercentage}% On-Time Follow-up</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/90 dark:bg-sky-950/60 border border-sky-200/90 dark:border-sky-800/60 text-[10px] font-bold text-sky-800 dark:text-sky-300 shadow-2xs shrink-0">
              <FileText size={11} className="text-sky-600 dark:text-sky-400" />
              <span>Estimates Auto-Synced</span>
            </span>
          </div>
        }
      />

      {/* 2. 4 Frosted Glass KPI Cards Matching Mockup & Dashboard (Context-Aware) */}
      <TasksKpiCards
        overdueCount={overdueCount}
        dueTodayCount={dueTodayCount}
        upcomingCount={upcomingCount}
        completedCount={completedCount}
        isLoading={isLoadingTasks}
      />

      {/* 3. Mode Switcher Tabs & Category Filter Pills */}
      <TasksFilterBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        activeTasksCount={activeTasksCount}
        personalTasksCount={personalActiveCount}
        categoryCounts={categoryCounts}
      />

      {/* 4. Main Body: Sectioned Team Operations List OR Dashboard Sticky Notes Board */}
      {activeTab === 'operations' ? (
        isLoadingTasks ? (
          <TaskItemsSkeleton count={6} />
        ) : tasks.length === 0 ? (
          /* Polished Empty State for 0 Operational Tasks */
          <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-2xs p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
              <CheckSquare size={32} className="stroke-[2.5]" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">No operational tasks yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                No operational tasks yet. Create a task above to track jobs and follow-ups.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>Create Task</span>
            </button>
          </div>
        ) : filteredTasks.length === 0 && tasks.length > 0 ? (
          /* Empty Search / Filter State */
          <div className="bg-white/80 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-2xs p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">No matching tasks found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No tasks match your current filter or search query.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearch('');
              }}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <TasksSectionList
            tasks={filteredTasks}
            onToggleTask={handleToggleTask}
            onSelectTask={(task) => setSelectedTask(task)}
          />
        )
      ) : (
        <PersonalStickyBoard
          tasks={personalTasks}
          onAddTask={addPersonalTask}
          onUpdateTask={updatePersonalTask}
          onToggleTask={togglePersonalTask}
          onTogglePin={togglePinTask}
          onDeleteTask={deletePersonalTask}
          completedCount={personalCompletedCount}
          progressPercent={personalProgressPercent}
        />
      )}

      {/* 5. Floating Action Button (FAB) Bottom-Right */}
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        title="Quick Add Task"
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full bg-gradient-to-tr from-[#1878B8] via-[#0284c7] to-[#38bdf8] text-white flex items-center justify-center shadow-xl shadow-sky-500/35 hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white/60 group"
      >
        <Plus size={24} className="stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* 6. Quick Task Creation Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAddTask={handleAddTask}
      />

      {/* 7. Task Detail / Inspector Modal (Opens on Click) */}
      <CrmTaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onToggleStatus={handleToggleTask}
      />
    </div>
  );
}

export default TasksPage;
