import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Layers,
  Check,
} from 'lucide-react';
import { TeamOperationEvent } from '@/types/calendarTypes';
import { CATEGORY_CONFIG } from '@/data/calendarData';

interface CalendarMonthGridProps {
  currentMonthName: string;
  currentYear?: number;
  currentMonth?: number; // 1-12
  selectedDay: number;
  onSelectDay: (day: number) => void;
  events: TeamOperationEvent[];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
}

export function CalendarMonthGrid({
  currentMonthName,
  currentYear,
  currentMonth,
  selectedDay,
  onSelectDay,
  events,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarMonthGridProps) {
  const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const year = currentYear || 2026;
  const month = currentMonth || 9;

  // Calculate first day of week (0=Sun, 1=Mon, ..., 6=Sat) and days in month
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstDayIndex;
  const totalCells = Math.max(35, Math.ceil((leadingBlanks + daysInMonth) / 7) * 7);

  // Real today highlight
  const now = new Date();
  const isRealCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const realTodayDay = now.getDate();

  // Map events by day number
  const eventsByDay: Record<number, TeamOperationEvent[]> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    eventsByDay[d] = [];
  }
  events.forEach((evt) => {
    if ((!evt.month || evt.month === month) && (!evt.year || evt.year === year)) {
      if (eventsByDay[evt.dayNumber]) {
        eventsByDay[evt.dayNumber].push(evt);
      }
    }
  });

  return (
    <div className="bg-white/85 dark:bg-slate-900/60 light-glass-panel rounded-3xl border border-white/90 dark:border-white/10 shadow-sm p-4 sm:p-5 flex flex-col justify-between select-none h-full">
      {/* Calendar Month Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentMonthName}
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 text-[11px] font-bold">
            <CalendarIcon size={12} className="stroke-[2.5]" />
            <span>{events.length} Operations</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToday}
            className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/90 dark:border-white/10 shadow-2xs hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            title="Previous Month"
            className="w-8 h-8 rounded-xl bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/90 dark:border-white/10 shadow-2xs hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            title="Next Month"
            className="w-8 h-8 rounded-xl bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/90 dark:border-white/10 shadow-2xs hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Days of Week Row */}
      <div className="grid grid-cols-7 gap-2 sm:gap-2.5 mb-2 shrink-0">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-black text-slate-400 dark:text-slate-500 tracking-wider py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 35-Cell Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-2.5 flex-1">
        {Array.from({ length: totalCells }).map((_, index) => {
          const dayNumber = index - leadingBlanks + 1;
          const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

          if (!isCurrentMonth) {
            return (
              <div
                key={`empty-${index}`}
                className="h-[122px] sm:h-[128px] rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100/60 dark:border-white/5 p-2 opacity-30 cursor-default"
              />
            );
          }

          const dayEvents = eventsByDay[dayNumber] || [];
          const isSelected = selectedDay === dayNumber;
          const isToday = isRealCurrentMonth ? dayNumber === realTodayDay : (month === 9 && year === 2026 && dayNumber === 15);
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={`day-${dayNumber}`}
              onClick={() => onSelectDay(dayNumber)}
              className={`h-[122px] sm:h-[128px] rounded-2xl p-2 transition-all flex flex-col justify-between cursor-pointer relative group ${
                isSelected
                  ? 'bg-sky-50/80 dark:bg-sky-950/40 border-2 border-[#1878B8] dark:border-sky-500 shadow-md shadow-sky-500/15'
                  : 'bg-white/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500 shadow-2xs hover:shadow-xs'
              }`}
            >
              {/* Day Number Header & Count Badge */}
              <div className="flex items-center justify-between shrink-0 mb-0.5">
                {isToday ? (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {dayNumber}
                  </div>
                ) : (
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-[#1878B8] dark:text-sky-400 font-black' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {dayNumber}
                  </span>
                )}

                {hasEvents && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shadow-2xs ${
                      dayEvents.length > 3
                        ? 'bg-sky-100 dark:bg-sky-950/80 text-[#0284c7] dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Day Event Pills (Up to 3 items shown by default) */}
              <div className="space-y-1 flex-1 flex flex-col justify-start overflow-hidden">
                {dayEvents.slice(0, 3).map((evt) => {
                  const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG['team_task'];
                  const isDone = evt.completed || evt.status === 'completed';

                  return (
                    <div
                      key={evt.id}
                      title={`${evt.startTime}: ${evt.title} (${evt.assignedToName})`}
                      className={`truncate text-[9px] sm:text-[9.5px] font-semibold px-1.5 py-0.5 rounded-lg border flex items-center gap-1 shadow-2xs transition-colors shrink-0 ${
                        isDone
                          ? 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5 line-through'
                          : 'bg-white/95 dark:bg-slate-900/90 border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-500'
                      }`}
                    >
                      {/* Priority / Category Dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            evt.priority === 'urgent'
                              ? '#f43f5e'
                              : evt.priority === 'high'
                              ? '#f59e0b'
                              : cfg?.dotColor || '#0284c7',
                        }}
                      />

                      {/* Small Assignee Initials */}
                      {evt.assignedToInitials && (
                        <span className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          [{evt.assignedToInitials}]
                        </span>
                      )}

                      <span className="truncate">{evt.title}</span>
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div
                    title={`${dayEvents.length - 3} more operations stacked.`}
                    className="text-[9px] font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white bg-sky-50/90 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 rounded-lg px-1.5 py-0.5 flex items-center justify-between transition-colors mt-auto shrink-0 shadow-2xs"
                  >
                    <span className="flex items-center gap-1">
                      <Layers size={9} className="text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>+{dayEvents.length - 3} more</span>
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">view</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarMonthGrid;
