import React from 'react';
import { ChevronDown, Users, LayoutGrid, CheckSquare, Layers } from 'lucide-react';
import { OperationCategory, TeamMemberResource } from '@/types/calendarTypes';
import { CATEGORY_CONFIG, CREW_RESOURCES } from '@/data/calendarData';

interface CalendarFilterBarProps {
  viewMode?: 'month' | 'swimlanes';
  onViewModeChange?: (mode: 'month' | 'swimlanes') => void;
  selectedCategory: 'all' | OperationCategory;
  onSelectCategory: (cat: 'all' | OperationCategory) => void;
  selectedAssignee: string;
  onSelectAssignee: (assignee: string) => void;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
  eventCounts: Record<string, number>;
  teamMembers?: TeamMemberResource[];
}

export function CalendarFilterBar({
  viewMode,
  onViewModeChange,
  selectedCategory,
  onSelectCategory,
  selectedAssignee,
  onSelectAssignee,
  selectedStatus = 'all',
  onSelectStatus,
  eventCounts,
  teamMembers,
}: CalendarFilterBarProps) {
  const membersList = teamMembers && teamMembers.length > 0 ? teamMembers : CREW_RESOURCES;

  const CATEGORIES: Array<{ id: 'all' | OperationCategory; label: string }> = [
    { id: 'all', label: 'All Operations' },
    { id: 'team_task', label: 'Team Tasks & Follow-ups' },
    { id: 'client_meeting', label: 'Client Visits & Meetings' },
    { id: 'project_op', label: 'Project Operations' },
    { id: 'permit_filing', label: 'Permits & City Filings' },
    { id: 'warranty_audit', label: 'Warranty Audits' },
    { id: 'reminder', label: 'Reminders' },
  ];

  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 light-glass-panel border border-white/90 dark:border-white/10 shadow-2xs">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full xl:w-auto py-0.5">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = eventCounts[cat.id] || 0;
          const dotColor =
            cat.id === 'all'
              ? '#0284c7'
              : CATEGORY_CONFIG[cat.id]?.dotColor || '#64748b';

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs scale-[1.02] dark:bg-sky-600'
                  : 'bg-white/85 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 hover:border-sky-300 shadow-2xs dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-white/10'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-opacity"
                style={{
                  backgroundColor: isSelected ? '#38bdf8' : dotColor,
                }}
              />
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Controls: View Switcher + Assignee Selector + Status Toggle */}
      <div className="flex items-center gap-2.5 self-end xl:self-auto shrink-0 flex-wrap">
        {/* Status Toggle (All / Active / Done) */}
        {onSelectStatus && (
          <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
            {(['all', 'active', 'completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onSelectStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'all' ? 'All' : st === 'active' ? 'Active' : 'Done'}
              </button>
            ))}
          </div>
        )}

        {/* View Switcher: [Month] [Team Workload] */}
        {viewMode && onViewModeChange && (
          <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('swimlanes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'swimlanes'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Users size={13} />
              <span>Team Workload</span>
            </button>
          </div>
        )}

        {/* Assignee Filter Dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
            <Users size={12} className="text-slate-400 dark:text-slate-500" />
            <span>Staff:</span>
          </label>
          <div className="relative">
            <select
              value={selectedAssignee}
              onChange={(e) => onSelectAssignee(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-white/95 dark:bg-slate-800 border border-slate-200/90 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white shadow-2xs hover:border-sky-400 focus:outline-none focus:border-[#1878B8] cursor-pointer"
            >
              <option value="all">All Team Members</option>
              {membersList.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name} ({member.roleLabel || member.role})
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
              <ChevronDown size={13} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarFilterBar;
