import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Check,
  Trash2,
  Calendar,
  Tag,
  Clock,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  PersonalTask,
  TaskPriority,
  WorkCategory,
  PRIORITY_OPTIONS,
} from '@/lib/personalTasksStore';
import { useAuth } from '@/context/AuthContext';
import { CrmModal } from './CrmModal';
import { ConfirmDialog } from './ConfirmDialog';
import { PersonalWorkCategorySelector } from './PersonalWorkCategorySelector';

export interface PersonalTaskDetailModalProps {
  task: PersonalTask | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PersonalTask>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
}

export function PersonalTaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onToggle,
}: PersonalTaskDetailModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [workCategory, setWorkCategory] = useState<WorkCategory>('');
  const [dueDate, setDueDate] = useState('Today');
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setPriority(task.priority || 'normal');
      setWorkCategory(task.workCategory || '');
      setDueDate(task.dueDate || 'Today');
      setCompleted(!!task.completed);
      setNotes((task as any).notes || '');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleToggleCompleted = async () => {
    const nextCompleted = !completed;
    setCompleted(nextCompleted);
    await onToggle(task.id);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        priority,
        workCategory,
        dueDate,
        completed,
        notes: notes.trim(),
      });
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
      {/* Delete Action */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 transition-all cursor-pointer hover:border-rose-300 dark:hover:border-rose-700"
      >
        <Trash2 size={13} />
        <span>{isDeleting ? 'Deleting...' : 'Delete Note'}</span>
      </button>

      {/* Save & Cancel Actions */}
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
          <Save size={14} className="stroke-[2.5]" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <CrmModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sticky Note Details"
      subtitle="View, edit priority, work category, or mark status."
      badge={{
        label: completed ? 'Completed' : 'Pending',
        variant: completed ? 'emerald' : 'sky',
      }}
      icon={<CheckSquare size={18} className="stroke-[2.5]" />}
      iconGradient="from-[#1878B8] to-[#0284c7]"
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
        {/* ========================================================
            STATUS TOGGLE HERO BANNER
            ======================================================== */}
        <div
          onClick={handleToggleCompleted}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
            completed
              ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/40'
              : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-sky-50/80 dark:hover:bg-sky-950/30 hover:border-sky-300 dark:hover:border-sky-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                completed
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                  : 'bg-white dark:bg-white/10 border-slate-300 dark:border-white/20'
              }`}
            >
              {completed && <Check size={14} className="stroke-[3]" />}
            </div>
            <div>
              <div className="font-bold text-xs">
                {completed ? 'Marked as Completed' : 'Status: In Progress'}
              </div>
              <div className="text-[10.5px] opacity-75">
                {completed ? 'Click to mark as active/pending again' : 'Click to mark as completed'}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs ${
              completed
                ? 'bg-white dark:bg-white/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
            }`}
          >
            {completed ? 'Done' : 'Active'}
          </span>
        </div>

        {/* ========================================================
            SECTION 1: NOTE TITLE / CONTENT
            ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sticky Note Content
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Call HOA property manager regarding Vista permit"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] focus:ring-3 focus:ring-sky-400/20 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
          />
        </div>

        {/* ========================================================
            SECTION 2: PRIORITY LEVEL SELECTION
            ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-amber-500 to-rose-500" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Priority Level
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Color-coded badge</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map((opt) => {
              const isSelected = priority === opt.id;

              let selectedClass = '';
              if (opt.id === 'urgent') {
                selectedClass = isSelected
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 ring-2 ring-rose-400/30 shadow-xs scale-[1.02]'
                  : 'bg-slate-50/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs';
              } else if (opt.id === 'high') {
                selectedClass = isSelected
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30 shadow-xs scale-[1.02]'
                  : 'bg-slate-50/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs';
              } else if (opt.id === 'normal') {
                selectedClass = isSelected
                  ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-[#0284c7] dark:text-sky-300 ring-2 ring-sky-400/30 shadow-xs scale-[1.02]'
                  : 'bg-slate-50/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs';
              } else {
                selectedClass = isSelected
                  ? 'bg-slate-100 dark:bg-white/20 border-slate-300 dark:border-white/20 text-slate-800 dark:text-white ring-2 ring-slate-400/30 shadow-xs scale-[1.02]'
                  : 'bg-slate-50/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriority(opt.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${selectedClass}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </div>
                  {isSelected && <Check size={12} className="stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            SECTION 3: WORK CATEGORY SELECTION
            ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-purple-500" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Work Category
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Project stream</span>
          </div>

          <PersonalWorkCategorySelector
            selectedCategory={workCategory}
            onSelectCategory={setWorkCategory}
            userId={user?.id}
          />
        </div>

        {/* ========================================================
            SECTION 4: DUE DATE / REMINDER SHORTCUTS
            ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-slate-400" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Due Date / Reminder
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['Today', 'Tomorrow', 'This Week', 'Pending'].map((chip) => {
              const isSelected = dueDate === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDueDate(chip)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#1878B8] text-white border-[#1878B8] shadow-xs font-bold scale-105'
                      : 'bg-slate-50/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200/90 dark:border-white/10 shadow-2xs font-semibold'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            SECTION 5: OPTIONAL DETAILED NOTES
            ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-slate-400" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Additional Details / Follow-Up Notes
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
          </div>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any extra phone numbers, reference permit IDs, or instructions..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] focus:ring-3 focus:ring-sky-400/20 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all resize-none shadow-2xs"
          />
        </div>
      </form>
    </CrmModal>

    <ConfirmDialog
      isOpen={isConfirmDeleteOpen}
      title="Delete Sticky Note"
      message={`Are you sure you want to delete personal note "${title || 'Untitled Note'}"?`}
      confirmLabel="Delete Note"
      variant="danger"
      onConfirm={async () => {
        setIsDeleting(true);
        try {
          await onDelete(task.id);
          setIsConfirmDeleteOpen(false);
          onClose();
        } finally {
          setIsDeleting(false);
        }
      }}
      onCancel={() => setIsConfirmDeleteOpen(false)}
    />
    </>
  );
}
