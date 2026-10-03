import React from 'react';
import { Flag } from 'lucide-react';
import { OperationCategory, OperationPriority } from '@/types/calendarTypes';

interface ScheduleCategoryPriorityProps {
  category: OperationCategory;
  priority: OperationPriority;
  onCategoryChange: (category: OperationCategory) => void;
  onPriorityChange: (priority: OperationPriority) => void;
}

export function ScheduleCategoryPriority({
  category,
  priority,
  onCategoryChange,
  onPriorityChange,
}: ScheduleCategoryPriorityProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Category */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
          Operation Category
        </label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as OperationCategory)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all bg-white dark:bg-slate-900 cursor-pointer shadow-2xs"
        >
          <option value="team_task">Team Task & Follow-up</option>
          <option value="client_meeting">Client Visit & Meeting</option>
          <option value="project_op">Project Operation / Milestone</option>
          <option value="permit_filing">City Permit Inspection / Filing</option>
          <option value="warranty_audit">Warranty Audit & Roof Check</option>
          <option value="reminder">Reminder & Internal Milestone</option>
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
          <Flag size={12} className="text-slate-400" />
          <span>Priority Level</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['normal', 'high', 'urgent'] as OperationPriority[]).map((p) => {
            const isSelected = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPriorityChange(p)}
                className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center ${
                  isSelected
                    ? p === 'urgent'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-700 shadow-xs'
                      : p === 'high'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700 shadow-xs'
                      : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-400 dark:border-sky-700 shadow-xs'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
