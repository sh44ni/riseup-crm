import React from 'react';
import { Flag } from 'lucide-react';
import { OperationCategory, OperationPriority } from '@/types/calendarTypes';

import { CrmSelect } from '@/components/common/CrmSelect';

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
        <CrmSelect
          value={category}
          onChange={(val) => onCategoryChange(val as OperationCategory)}
          options={[
            { value: 'team_task', label: 'Team Task & Follow-up' },
            { value: 'client_meeting', label: 'Client Visit & Meeting' },
            { value: 'project_op', label: 'Project Operation / Milestone' },
            { value: 'permit_filing', label: 'City Permit Inspection / Filing' },
            { value: 'warranty_audit', label: 'Warranty Audit & Roof Check' },
            { value: 'reminder', label: 'Reminder & Internal Milestone' },
          ]}
        />
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
