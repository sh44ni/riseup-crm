import React from 'react';
import { UserCheck, CheckCircle2 } from 'lucide-react';
import { TeamMemberResource } from '@/types/calendarTypes';

interface ScheduleAssigneeSectionProps {
  teamMembers: TeamMemberResource[];
  assignedUserId: number | string;
  onAssigneeChange: (id: number | string) => void;
}

export function ScheduleAssigneeSection({
  teamMembers,
  assignedUserId,
  onAssigneeChange,
}: ScheduleAssigneeSectionProps) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
        <UserCheck size={13} className="text-sky-600 dark:text-sky-400" />
        <span>Assign Team Member</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {teamMembers.map((member) => {
          const isSelected = String(assignedUserId) === String(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onAssigneeChange(member.id)}
              className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                isSelected
                  ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 shadow-xs'
                  : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${
                  member.avatarColor || 'from-sky-500 to-blue-600'
                } text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs`}
              >
                {member.initials || 'TM'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {member.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  {member.roleLabel || member.role}
                </div>
              </div>
              {isSelected && (
                <CheckCircle2 size={14} className="text-[#0284c7] dark:text-sky-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
