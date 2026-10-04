import React, { useMemo } from 'react';
import {
  Users,
  Plus,
} from 'lucide-react';
import { TeamOperationEvent, TeamMemberResource } from '@/types/calendarTypes';
import { CATEGORY_CONFIG } from '@/shared/config/calendarConfig';

interface CalendarSwimlanesViewProps {
  events: TeamOperationEvent[];
  selectedDay: number;
  currentYear?: number;
  currentMonth?: number;
  teamMembers?: TeamMemberResource[];
  onSelectDay: (day: number) => void;
  onSelectEvent: (event: TeamOperationEvent) => void;
  onQuickSchedule?: (memberId: number | string, day: number) => void;
}

export function CalendarSwimlanesView({
  events,
  selectedDay,
  currentYear,
  currentMonth,
  teamMembers,
  onSelectDay,
  onSelectEvent,
  onQuickSchedule,
}: CalendarSwimlanesViewProps) {
  const year = currentYear || 2026;
  const month = currentMonth || 9;
  const daysInMonth = new Date(year, month, 0).getDate();

  const teamMembersList = teamMembers && teamMembers.length > 0 ? teamMembers : [];

  // Dynamic 7 days of the active week (Monday to Sunday)
  const targetDate = new Date(year, month - 1, Math.min(selectedDay || 15, daysInMonth));
  const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(targetDate);
  mondayDate.setDate(targetDate.getDate() - distanceToMonday);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dayNum = d.getDate();
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const fullDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return {
        day: dayNum,
        label: dayLabel,
        fullDateStr,
      };
    });
  }, [mondayDate]);

  // Compute actual schedule conflicts (member assigned to 2+ active operations on the same day)
  const totalConflicts = useMemo(() => {
    let count = 0;
    teamMembersList.forEach((member) => {
      const memberEvents = events.filter(
        (e) =>
          (String(e.assignedToUserId) === String(member.id) ||
            (e.assignedToName && e.assignedToName.toLowerCase() === member.name.toLowerCase())) &&
          !e.completed &&
          e.status !== 'completed'
      );
      weekDays.forEach((w) => {
        const dEvts = memberEvents.filter((e) => e.dayNumber === w.day || e.date === w.fullDateStr);
        if (dEvts.length > 1) {
          count += 1;
        }
      });
    });
    return count;
  }, [teamMembersList, events, weekDays]);

  return (
    <div className="bg-white/85 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-2.5 sm:p-3.5 select-none flex flex-col h-full min-h-0 overflow-hidden space-y-2">
      {/* Swimlanes Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Team Workload &amp; Capacity
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 text-[10px] font-black uppercase">
              Registered Staff
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Real-time staff workload, site operations, and scheduled team tasks for {weekDays[0].label} – {weekDays[6].label}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {teamMembersList.length} Team Members
          </span>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              totalConflicts > 0
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            {totalConflicts === 0
              ? 'Balanced Capacity'
              : `${totalConflicts} Heavy Day${totalConflicts === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto pr-1 pb-1">
        <div className="min-w-[840px]">
          {/* Timeline Header Days */}
          <div className="grid grid-cols-12 gap-2 pb-2 mb-2 border-b border-slate-200/80 dark:border-white/10 text-xs font-black text-slate-500 dark:text-slate-400">
            <div className="col-span-4 pl-2">Team Member &amp; Role</div>
            <div className="col-span-8 grid grid-cols-7 gap-1 text-center">
              {weekDays.map((w) => (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => onSelectDay(w.day)}
                  className={`py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    selectedDay === w.day
                      ? 'bg-[#1878B8] text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Team Member Rows */}
          <div className="space-y-2.5">
            {teamMembersList.map((member) => {
              const memberEvents = events.filter(
                (e) =>
                  String(e.assignedToUserId) === String(member.id) ||
                  (e.assignedToName && e.assignedToName.toLowerCase() === member.name.toLowerCase())
              );

              return (
                <div
                  key={member.id}
                  className="grid grid-cols-12 gap-2 p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500 transition-all items-center"
                >
                  {/* Left Member Info */}
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${
                        member.avatarColor || 'from-sky-500 to-blue-600'
                      } text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0`}
                    >
                      {member.initials || member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span>{member.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <span className="px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 font-semibold text-[9px]">
                          {member.roleLabel || member.role}
                        </span>
                      </div>
                      {member.phone && (
                        <div className="text-[9.5px] text-slate-400 dark:text-slate-500 font-mono truncate">
                          {member.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 7 Day Blocks for this Member */}
                  <div className="col-span-8 grid grid-cols-7 gap-1 min-h-[46px] items-center">
                    {weekDays.map((w) => {
                      const dayEvts = memberEvents.filter(
                        (e) => e.dayNumber === w.day || e.date === w.fullDateStr
                      );

                      if (dayEvts.length === 0) {
                        return (
                          <div
                            key={w.day}
                            onClick={() => {
                              onSelectDay(w.day);
                              if (onQuickSchedule) onQuickSchedule(member.id, w.day);
                            }}
                            className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-dashed border-slate-200/70 dark:border-white/10 flex items-center justify-center hover:bg-sky-50/50 dark:hover:bg-sky-950/30 hover:border-sky-300 dark:hover:border-sky-600 cursor-pointer transition-colors group"
                            title={`Available - Click to assign task to ${member.name}`}
                          >
                            <span className="text-[9.5px] font-bold text-slate-300 dark:text-slate-600 group-hover:text-sky-600 dark:group-hover:text-sky-400 flex items-center gap-0.5">
                              <Plus size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span>Open</span>
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={w.day} className="space-y-1">
                          {dayEvts.map((evt) => {
                            const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG['team_task'];
                            const isDone = evt.completed || evt.status === 'completed';

                            return (
                              <button
                                key={evt.id}
                                type="button"
                                onClick={() => {
                                  onSelectDay(w.day);
                                  onSelectEvent(evt);
                                }}
                                className={`w-full text-left p-1 rounded-lg border shadow-2xs transition-all hover:scale-[1.02] cursor-pointer ${
                                  isDone
                                    ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5 line-through'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-sky-400 dark:hover:border-sky-500'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: cfg.dotColor }}
                                  />
                                  <span className="text-[9px] font-bold text-slate-900 dark:text-white truncate block">
                                    {evt.title}
                                  </span>
                                </div>
                                <div className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono truncate pl-2.5">
                                  {evt.startTime}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarSwimlanesView;
