import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Check,
  User,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { CrmTask, TaskPriority, TaskCategory, TaskStatus } from '@/types/taskTypes';
import { CrmModal } from '@/components/common/CrmModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { api } from '@/lib/api';

interface UserItem {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

export interface CrmTaskDetailModalProps {
  task: CrmTask | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask?: (updated: CrmTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onToggleStatus?: (taskId: string) => void;
}

function formatRole(role?: string): string {
  if (!role) return 'Team Member';
  const map: Record<string, string> = {
    owner: 'Owner & Executive',
    project_manager: 'Project Manager',
    field_foreman: 'Field Foreman',
    senior_estimator: 'Senior Estimator',
    sales_rep: 'Sales Representative',
    office_admin: 'Logistics Coordinator',
    field_inspector: 'Field Inspector',
    admin: 'Administrator',
  };
  return map[role.toLowerCase()] || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CrmTaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onToggleStatus,
}: CrmTaskDetailModalProps) {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [estimateAmount, setEstimateAmount] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [category, setCategory] = useState<TaskCategory>('rise_up');
  const [status, setStatus] = useState<TaskStatus>('active');
  const [dueDateStr, setDueDateStr] = useState('');
  const [assignedTo, setAssignedTo] = useState('Unassigned');
  const [assignedToUserId, setAssignedToUserId] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Dynamic team members from API
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setClientName(task.clientName || '');
      setEstimateAmount(task.estimateAmount ? String(task.estimateAmount) : '');
      setPriority(task.priority || 'normal');
      setCategory(task.category || 'rise_up');
      setStatus(task.status || 'active');
      setDueDateStr(task.dueDateFormatted || 'Today, 5:00 PM');
      setAssignedTo(task.assignedTo || 'Unassigned');
      setAssignedToUserId(task.assignedToUserId);
      setDescription(task.description || '');
    }
  }, [task, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingUsers(true);

    api.getUsers()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
        setUsers(list);
      })
      .catch((err) => {
        console.warn('Failed to load team users for task detail:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const isCompleted = status === 'completed';

  const handleToggleCompleted = () => {
    const nextStatus: TaskStatus = isCompleted ? 'active' : 'completed';
    setStatus(nextStatus);
    if (onToggleStatus) {
      onToggleStatus(task.id);
    }
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Unassigned' || !val) {
      setAssignedTo('Unassigned');
      setAssignedToUserId(undefined);
    } else {
      const uid = Number(val);
      const matched = users.find((u) => u.id === uid);
      if (matched) {
        setAssignedTo(matched.name);
        setAssignedToUserId(matched.id);
      } else {
        setAssignedTo(val);
        setAssignedToUserId(undefined);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      if (onUpdateTask) {
        onUpdateTask({
          ...task,
          title: title.trim(),
          clientName: clientName.trim() || undefined,
          estimateAmount: estimateAmount ? Number(estimateAmount) : undefined,
          priority,
          category,
          status,
          dueDateFormatted: dueDateStr,
          assignedTo: assignedTo || 'Unassigned',
          assignedToUserId,
          assignedInitials:
            assignedTo && assignedTo !== 'Unassigned'
              ? assignedTo
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : undefined,
          description: description.trim() || undefined,
        });
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setIsConfirmDeleteOpen(true);
  };

  const footer = (
    <div className="w-full flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={handleDelete}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 transition-all cursor-pointer hover:border-rose-300 dark:hover:border-rose-700"
      >
        <Trash2 size={13} />
        <span>Delete Task</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || isSaving}
          className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] via-[#0284c7] to-[#38bdf8] hover:brightness-105 active:scale-[0.98] text-white text-xs font-black shadow-[0_4px_16px_rgba(24,120,184,0.35)] hover:shadow-[0_6px_22px_rgba(24,120,184,0.45)] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="stroke-[2.5]" />}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <CrmModal
      isOpen={isOpen}
      onClose={onClose}
      title="Task & Follow-Up Details"
      subtitle="Operations SLA, client follow-up, and estimate tracking."
      badge={{
        label: isCompleted ? 'Completed' : 'Active',
        variant: isCompleted ? 'emerald' : 'sky',
      }}
      icon={<CheckSquare size={18} className="stroke-[2.5]" />}
      iconGradient="from-[#1878B8] to-[#0284c7]"
      maxWidth="xl"
      footer={footer}
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
        {/* Status Toggle Banner */}
        <div
          onClick={handleToggleCompleted}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
            isCompleted
              ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/40'
              : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-sky-50/80 dark:hover:bg-sky-950/30 hover:border-sky-300 dark:hover:border-sky-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                  : 'bg-white dark:bg-white/10 border-slate-300 dark:border-white/20'
              }`}
            >
              {isCompleted && <Check size={14} className="stroke-[3]" />}
            </div>
            <div>
              <div className="font-bold text-xs">
                {isCompleted ? 'Marked as Completed' : 'Task Status: Active'}
              </div>
              <div className="text-[10.5px] opacity-75">
                {isCompleted ? 'Click to mark as active follow-up' : 'Click to mark as completed'}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs ${
              isCompleted
                ? 'bg-white dark:bg-white/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
            }`}
          >
            {isCompleted ? 'Done' : 'Active'}
          </span>
        </div>

        {/* Task Title */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Task Title
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] focus:ring-3 focus:ring-sky-400/20 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
          />
        </div>

        {/* Client & Linked Estimate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Client / Homeowner</label>
            <div className="relative">
              <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="David Martinez"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-900 dark:text-white outline-none shadow-2xs placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Linked Estimate ($)</label>
            <div className="relative">
              <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="number"
                value={estimateAmount}
                onChange={(e) => setEstimateAmount(e.target.value)}
                placeholder="24850"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-900 dark:text-white outline-none shadow-2xs placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Priority & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full p-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-900 dark:text-white outline-none shadow-2xs cursor-pointer"
            >
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟡 High</option>
              <option value="normal">🔵 Normal</option>
              <option value="low">⚪ Low</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full p-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-900 dark:text-white outline-none shadow-2xs cursor-pointer"
            >
              <option value="rise_up">Rise Up Operations</option>
              <option value="estimate_followup">Estimate Follow-Up</option>
              <option value="permits_city">City Permits</option>
              <option value="content_creation">Content Creation</option>
              <option value="marketing">Marketing</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Due Date & Dynamic Assignee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Due Date &amp; Time</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                placeholder="Sep 20, 2:00 PM"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-900 dark:text-white outline-none shadow-2xs placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Assigned To</label>
            <select
              value={assignedToUserId ? String(assignedToUserId) : assignedTo}
              onChange={handleAssigneeChange}
              disabled={isLoadingUsers}
              className="w-full p-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] text-xs font-semibold text-slate-900 dark:text-white outline-none shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <option value="Unassigned">⚠️ Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} ({formatRole(u.role)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes & Description */}
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">Notes &amp; Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add operational notes, customer phone notes, or permit status..."
            className="w-full p-3 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] focus:ring-3 focus:ring-sky-400/20 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all resize-none shadow-2xs"
          />
        </div>
      </form>
    </CrmModal>

    <ConfirmDialog
      isOpen={isConfirmDeleteOpen}
      title="Delete Operational Task"
      message={`Are you sure you want to delete task "${title || 'Untitled Task'}"? This action cannot be undone.`}
      confirmLabel="Delete Task"
      variant="danger"
      onConfirm={() => {
        if (task && onDeleteTask) onDeleteTask(task.id);
        setIsConfirmDeleteOpen(false);
        onClose();
      }}
      onCancel={() => setIsConfirmDeleteOpen(false)}
    />
    </>
  );
}
