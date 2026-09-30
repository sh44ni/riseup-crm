import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowRight, Check, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { useCalendarEvents, CATEGORY_ACCENT_COLORS } from '@/lib/calendarStore';
import { DispatchEvent } from '@/types/calendarTypes';

export function SidebarScheduleWidget() {
  const navigate = useNavigate();
  const { events, toggleEventStatus } = useCalendarEvents();

  const [showAllAgenda, setShowAllAgenda] = useState(false);

  // Selected day number in September 2026 (defaults to 11 to match executive dashboard focus)
  const selectedDayNumber = 11;
  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // Events filtered for the current day
  const dayEvents = useMemo(() => {
    return events.filter((e) => e.dayNumber === selectedDayNumber || e.date?.endsWith('-11'));
  }, [events, selectedDayNumber]);

  // Navigate to calendar with day filter
  const handleOpenCalendar = (eventId?: string) => {
    const query = eventId
      ? `/calendar?day=${selectedDayNumber}&eventId=${encodeURIComponent(eventId)}`
      : `/calendar?day=${selectedDayNumber}`;
    navigate(query);
  };

  return (
    <div className="relative z-10 rounded-2xl light-glass-panel glossy-sheen border border-white/85 dark:border-white/10 shadow-xs p-3 space-y-2 select-none group/schedule hover:border-sky-300 dark:hover:border-sky-500/30 transition-all">
      {/* ========================================================
          1. HEADER: Title, Date & Calendar Link
          ======================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#1F1F1F] dark:text-white leading-none">Today's Schedule</h3>
          <span className="text-[9.5px] text-slate-400 dark:text-slate-400 font-medium">
            {todayDateStr}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleOpenCalendar()}
          className="text-[9.5px] font-bold text-[#0284c7] hover:text-[#0369a1] dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-0.5 group transition-colors cursor-pointer"
        >
          <span>Calendar</span>
          <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* ========================================================
          2. INTERACTIVE AGENDA DISPATCH CARDS (Top 2 or All)
          ======================================================== */}
      <div className="space-y-1.5 pt-0.5">
        {dayEvents.length === 0 ? (
          <div className="py-4 text-center rounded-xl bg-white/40 dark:bg-slate-900/50 border border-white/60 dark:border-white/10 p-2 text-slate-400 dark:text-slate-500">
            <CalendarIcon size={16} className="mx-auto mb-1 text-slate-400 opacity-60" />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-300">No dispatches scheduled</p>
            <button
              type="button"
              onClick={() => handleOpenCalendar()}
              className="text-[9px] font-bold text-[#0284c7] dark:text-sky-400 hover:underline mt-1 inline-block"
            >
              + Schedule on Calendar
            </button>
          </div>
        ) : (
          (showAllAgenda ? dayEvents : dayEvents.slice(0, 2)).map((event) => {
            const isCompleted = event.status === 'completed';
            const isCurrent = event.status === 'in_progress';
            const accentColor = CATEGORY_ACCENT_COLORS[event.category] || '#0284c7';

            return (
              <div
                key={event.id}
                onClick={() => handleOpenCalendar(event.id)}
                className={`group relative flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-gradient-to-r from-rose-50/90 via-white/80 to-white/90 dark:from-rose-950/40 dark:via-slate-900/60 dark:to-slate-900/80 border-rose-300/80 dark:border-rose-800/60 shadow-xs ring-1 ring-rose-200/60 dark:ring-rose-900/40 hover:border-rose-400 backdrop-blur-md'
                    : isCompleted
                    ? 'bg-white/40 dark:bg-slate-900/40 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-slate-800/50 backdrop-blur-xs'
                    : 'liquid-glass-tile border-white/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500/30 hover:shadow-2xs'
                }`}
              >
                {/* Stage Color Left Stripe */}
                <div
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                  style={{ backgroundColor: isCurrent ? '#e11d48' : accentColor }}
                />

                <div className="flex items-center gap-2 pl-1.5 min-w-0">
                  {/* Status Indicator / Completion Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEventStatus(event.id);
                    }}
                    title={isCompleted ? 'Mark scheduled' : 'Mark completed'}
                    className="shrink-0 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  >
                    {isCompleted ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                        <Check size={9} className="stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="relative flex items-center justify-center w-4 h-4">
                        <span className="absolute w-3.5 h-3.5 rounded-full bg-rose-400/50 animate-ping" />
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                      </div>
                    ) : (
                      <div
                        className="w-2 h-2 rounded-full group-hover:scale-125 transition-transform"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </button>

                  {/* Title & Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 leading-tight">
                      <span
                        className={`text-[11px] font-bold truncate ${
                          isCompleted
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : isCurrent
                            ? 'text-rose-950 dark:text-rose-200 font-extrabold'
                            : 'text-[#1F1F1F] dark:text-slate-100'
                        }`}
                      >
                        {event.title}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider animate-pulse">
                          NOW
                        </span>
                      )}
                    </div>
                    <div className="text-[9.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{event.startTime}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="truncate">{event.city || event.address}</span>
                    </div>
                  </div>
                </div>

                {/* Right Badge / Time Action */}
                <div className="shrink-0 pl-1">
                  {isCompleted ? (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                      Done
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[9.5px] font-black text-rose-600 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-800/60 shadow-2xs">
                      {event.startTime}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 group-hover:text-slate-700 dark:group-hover:text-slate-100 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700/80 transition-colors px-1.5 py-0.5 rounded-md">
                      {event.startTime}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================
          3. VIEW ALL / COLLAPSE EXPANDER
          ======================================================== */}
      {dayEvents.length > 2 ? (
        <button
          type="button"
          onClick={() => setShowAllAgenda((prev) => !prev)}
          className="w-full py-1.5 px-3 rounded-xl liquid-glass-btn text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#0284c7] dark:hover:text-sky-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
        >
          <span>{showAllAgenda ? 'Show Less' : `View All (${dayEvents.length})`}</span>
          <ChevronDown
            size={12}
            className={`text-slate-400 group-hover:text-[#0284c7] transition-transform duration-200 ${
              showAllAgenda ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : dayEvents.length > 0 ? (
        <button
          type="button"
          onClick={() => handleOpenCalendar()}
          className="w-full py-1.5 px-3 rounded-xl liquid-glass-btn text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#0284c7] dark:hover:text-sky-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
        >
          <span>{`View All (${dayEvents.length})`}</span>
          <ChevronDown
            size={12}
            className="text-slate-400 group-hover:text-[#0284c7] transition-transform duration-200"
          />
        </button>
      ) : null}
    </div>
  );
}
