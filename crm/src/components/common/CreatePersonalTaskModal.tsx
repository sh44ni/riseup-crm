import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Plus,
  Check,
} from 'lucide-react';
import {
  TaskPriority,
  WorkCategory,
  PRIORITY_OPTIONS,
  PersonalTask,
  useUserCustomCategories,
} from '@/lib/personalTasksStore';
import { useAuth } from '@/context/AuthContext';
import { CrmModal } from './CrmModal';
import { PersonalWorkCategorySelector } from './PersonalWorkCategorySelector';

export interface CreatePersonalTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<PersonalTask, 'id' | 'createdAt'>) => Promise<any>;
}

export function CreatePersonalTaskModal({
  isOpen,
  onClose,
  onAddTask,
}: CreatePersonalTaskModalProps) {
  const { user } = useAuth();
  const { categories } = useUserCustomCategories(user?.id);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('urgent');
  const [workCategory, setWorkCategory] = useState<WorkCategory>('');
  const [dueDate, setDueDate] = useState('Today');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPriority('urgent');
      setWorkCategory(categories[0] || '');
      setDueDate('Today');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddTask({
        title: title.trim(),
        priority,
        workCategory,
        completed: false,
        dueDate,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="w-full flex items-center justify-end gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!title.trim() || isSubmitting}
        className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] via-[#0284c7] to-[#38bdf8] hover:brightness-105 active:scale-[0.98] text-white text-xs font-black shadow-[0_4px_16px_rgba(24,120,184,0.35)] hover:shadow-[0_6px_22px_rgba(24,120,184,0.45)] transition-all disabled:opacity-50 cursor-pointer"
      >
        <Plus size={14} className="stroke-[3]" />
        <span>{isSubmitting ? 'Saving...' : 'Add Sticky Note'}</span>
      </button>
    </div>
  );

  return (
    <CrmModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Sticky Note / To-Do"
      subtitle="Individual reminder saved to your personal dashboard dock."
      badge={{ label: 'Personal Scope', variant: 'sky' }}
      icon={<CheckSquare size={18} className="stroke-[2.5]" />}
      iconGradient="from-[#1878B8] to-[#0284c7]"
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
        {/* ========================================================
            SECTION 1: TITLE / NOTE DESCRIPTION
            ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#1878B8] to-[#55C4F5]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sticky Note Description
            </span>
            <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 via-slate-100 dark:via-white/5 to-transparent flex-1" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">What needs to be done?</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            required
            placeholder="e.g. Call HOA property manager regarding Vista permit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/10 focus:border-[#1878B8] focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
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

              // Crisp, tactile light/dark styling
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
      </form>
    </CrmModal>
  );
}
