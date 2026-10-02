import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Eye,
} from 'lucide-react';
import { ColumnData, EnrichedDeal, enrichDeals } from './pipelineTypes';
import { useAuth } from '@/context/AuthContext';

interface PipelineCalendarViewProps {
  columns: ColumnData[];
  pipelineSearch: string;
  onSelectDeal: (deal: EnrichedDeal) => void;
  getServiceBadgeClass: (color: string) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Days in a given month (month is 0-indexed). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Day-of-week (0=Sun) of the 1st of a month. */
function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─────────────────────────────────────────────────────────────────────────────

export function PipelineCalendarView({
  columns,
  pipelineSearch,
  onSelectDeal,
  getServiceBadgeClass,
}: PipelineCalendarViewProps) {
  const { can } = useAuth();
  const canViewFinances = can('finances.view');

  // Real "today" values — computed once on mount
  const realNow = useMemo(() => new Date(), []);
  const realTodayDay   = realNow.getDate();
  const realTodayMonth = realNow.getMonth();  // 0-indexed
  const realTodayYear  = realNow.getFullYear();

  // Viewing month/year (navigation state)
  const [viewYear,  setViewYear]  = useState(realTodayYear);
  const [viewMonth, setViewMonth] = useState(realTodayMonth);

  // Selected day (defaults to today's day-of-month)
  const [activeDay, setActiveDay] = useState<number>(realTodayDay);

  const [calendarMode, setCalendarMode] = useState<'month' | 'agenda'>('month');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  const allDeals = useMemo(() => enrichDeals(columns), [columns]);

  // Filter deals by search & stage
  const filteredDeals = useMemo(() => {
    let list = allDeals;
    if (selectedStageFilter !== 'all') {
      list = list.filter((d) => d.stageId === selectedStageFilter);
    }
    if (pipelineSearch.trim()) {
      const q = pipelineSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.service.toLowerCase().includes(q) ||
          d.stageTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allDeals, selectedStageFilter, pipelineSearch]);

  // Group deals by day — only those whose scheduledMonth+Year match the viewed month
  const dealsByDay = useMemo(() => {
    const map: Record<number, EnrichedDeal[]> = {};
    for (let d = 1; d <= 31; d++) map[d] = [];
    filteredDeals.forEach((deal) => {
      if (deal.scheduledMonth === viewMonth && deal.scheduledYear === viewYear) {
        const day = deal.scheduledDay;
        if (map[day]) map[day].push(deal);
      }
    });
    return map;
  }, [filteredDeals, viewMonth, viewYear]);

  // Build calendar grid cells for the viewed month
  const calendarCells = useMemo(() => {
    const cells: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      month: number;  // 0-indexed
      year: number;
    }> = [];

    const totalDays  = daysInMonth(viewYear, viewMonth);
    const startDow   = firstDayOfWeek(viewYear, viewMonth); // 0=Sun

    // Leading days from previous month
    if (startDow > 0) {
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear  = viewMonth === 0 ? viewYear - 1 : viewYear;
      const prevTotal = daysInMonth(prevYear, prevMonth);
      for (let i = startDow - 1; i >= 0; i--) {
        cells.push({ dayNumber: prevTotal - i, isCurrentMonth: false, month: prevMonth, year: prevYear });
      }
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ dayNumber: d, isCurrentMonth: true, month: viewMonth, year: viewYear });
    }

    // Trailing days from next month to fill grid to a multiple of 7
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
    let trailing = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ dayNumber: trailing++, isCurrentMonth: false, month: nextMonth, year: nextYear });
    }

    return cells;
  }, [viewMonth, viewYear]);

  // Is the viewed month the real current month?
  const isViewingCurrentMonth = viewMonth === realTodayMonth && viewYear === realTodayYear;

  // Active day deals
  const activeDayDeals = dealsByDay[activeDay] || [];

  // Month navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else { setViewMonth((m) => m - 1); }
    setActiveDay(1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else { setViewMonth((m) => m + 1); }
    setActiveDay(1);
  };
  const goToToday = () => {
    setViewMonth(realTodayMonth);
    setViewYear(realTodayYear);
    setActiveDay(realTodayDay);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Calendar Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-2xl light-glass-panel border border-white/80 dark:border-white/10 shadow-2xs">
        {/* Left Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/70 dark:bg-slate-900/80 rounded-xl border border-white/80 dark:border-white/10 p-0.5 shadow-2xs">
            <button
              onClick={goToPrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="px-2.5 py-0.5 text-xs font-black text-[#1F1F1F] dark:text-slate-100 flex items-center gap-1 min-w-[110px] justify-center">
              <CalendarIcon size={12} className="text-[#1878B8]" />
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-2.5 py-1 rounded-xl liquid-glass-btn text-[11px] font-bold text-[#1878B8] dark:text-sky-400 hover:text-[#0284c7] shadow-2xs transition-all cursor-pointer"
          >
            Today ({MONTH_NAMES[realTodayMonth].slice(0, 3)} {realTodayDay})
          </button>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden md:inline">
            <strong className="text-slate-700 dark:text-slate-200 font-bold">{filteredDeals.length}</strong> dispatches &amp; touches
          </span>
        </div>

        {/* Right Mode Switch & Stage Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="px-2.5 py-1 rounded-xl liquid-glass-input text-[11px] font-semibold text-slate-700 dark:text-slate-200 dark:bg-slate-900 cursor-pointer focus:outline-none"
          >
            <option value="all">All Stages ({allDeals.length})</option>
            {columns.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title} ({col.cards.length})
              </option>
            ))}
          </select>

          <div className="flex items-center bg-white/60 dark:bg-slate-900/60 p-0.5 rounded-xl border border-white/80 dark:border-white/10 shadow-2xs">
            <button
              onClick={() => setCalendarMode('month')}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                calendarMode === 'month'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarMode('agenda')}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                calendarMode === 'agenda'
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Month Grid View */}
      {calendarMode === 'month' && (
        <div className="rounded-2xl light-glass-panel border border-white/85 dark:border-white/10 shadow-xs overflow-hidden p-2.5 space-y-2">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1 border-b border-slate-200/70 dark:border-white/10">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              const dayDeals = cell.isCurrentMonth ? dealsByDay[cell.dayNumber] || [] : [];
              // "Today" = the actual real current date matches this cell exactly
              const isToday =
                cell.isCurrentMonth &&
                isViewingCurrentMonth &&
                cell.dayNumber === realTodayDay;
              const isSelected = cell.isCurrentMonth && cell.dayNumber === activeDay;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) setActiveDay(cell.dayNumber);
                  }}
                  className={`min-h-[102px] p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    !cell.isCurrentMonth
                      ? 'bg-white/20 dark:bg-slate-900/20 border-slate-200/40 dark:border-white/5 opacity-40 select-none'
                      : isToday
                      ? 'ring-2 ring-[#0284c7] bg-sky-50/80 dark:bg-sky-950/40 shadow-[0_0_14px_rgba(2,132,199,0.20)] border-sky-300 dark:border-sky-500/50'
                      : isSelected
                      ? 'bg-white/90 dark:bg-slate-800/90 border-[#1878B8] dark:border-sky-400 shadow-xs'
                      : 'liquid-glass-tile border-white/70 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-400 hover:shadow-2xs'
                  }`}
                >
                  {/* Top Bar: Date Number & Badge */}
                  <div className="flex items-center justify-between leading-none">
                    <span
                      className={`text-[11px] font-black ${
                        isToday
                          ? 'text-[#0284c7] dark:text-sky-400'
                          : isSelected
                          ? 'text-[#1878B8] dark:text-sky-300'
                          : cell.isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {isToday && (
                      <span className="text-[7.5px] font-black px-1 py-0.5 rounded bg-[#0284c7] text-white tracking-wider">
                        TODAY
                      </span>
                    )}

                    {cell.isCurrentMonth && dayDeals.length > 0 && !isToday && (
                      <span className="text-[8px] font-bold px-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {dayDeals.length}
                      </span>
                    )}
                  </div>

                  {/* Deal Event Chips */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayDeals.slice(0, 2).map((deal) => (
                      <div
                        key={deal.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeal(deal);
                        }}
                        style={{
                          borderLeftColor: deal.stageAccent,
                          borderLeftWidth: '2.5px',
                        }}
                        className="p-1 rounded bg-white/90 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-750 border border-slate-200/50 dark:border-white/10 shadow-2xs hover:scale-[1.02] transition-all flex items-center justify-between gap-1 group/chip"
                        title={`${deal.name} - ${deal.service} (${deal.stageTitle})`}
                      >
                        <div className="truncate text-[9.5px] font-bold text-slate-800 dark:text-slate-200 group-hover/chip:text-[#1878B8] dark:group-hover/chip:text-sky-400">
                          {deal.name}
                        </div>
                        <span className="text-[7.5px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                          {deal.timeSlot.replace(' ', '')}
                        </span>
                      </div>
                    ))}

                    {dayDeals.length > 2 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDay(cell.dayNumber);
                        }}
                        className="text-[8.5px] font-bold text-[#1878B8] dark:text-sky-400 hover:underline px-0.5 cursor-pointer truncate"
                      >
                        +{dayDeals.length - 2} more deals...
                      </div>
                    )}
                  </div>

                  {/* Subtle stage dot indicator row */}
                  <div className="flex items-center gap-0.5 h-1">
                    {dayDeals.slice(0, 4).map((d, i) => (
                      <div
                        key={i}
                        style={{ backgroundColor: d.stageAccent }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Day Inspection Drawer */}
          <div className="mt-2 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#1F1F1F] dark:text-slate-100">
                  {MONTH_NAMES[viewMonth]} {activeDay}, {viewYear} Schedule
                </span>
                {isViewingCurrentMonth && activeDay === realTodayDay && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 border border-sky-300 dark:border-sky-500/40">
                    Today
                  </span>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  ({activeDayDeals.length} deals scheduled)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Click any deal to view inspection &amp; contact info</span>
            </div>

            {activeDayDeals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {activeDayDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => onSelectDeal(deal)}
                    style={{
                      borderLeftColor: deal.stageAccent,
                      borderLeftWidth: '3.5px',
                    }}
                    className="p-2 rounded-xl liquid-glass-tile hover:scale-[1.01] transition-all cursor-pointer shadow-2xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                        <Clock size={8.5} />
                        {deal.timeSlot}
                      </span>
                      <span
                        className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold ${getServiceBadgeClass(
                          deal.serviceColor
                        )}`}
                      >
                        {deal.service}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 truncate transition-colors">
                      {deal.name}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="truncate">{deal.location}</span>
                      {canViewFinances ? (
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">${deal.value.toLocaleString()}</strong>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">
                No pipeline appointments scheduled for {MONTH_NAMES[viewMonth]} {activeDay}. Select another date on the calendar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agenda Mode View */}
      {calendarMode === 'agenda' && (
        <div className="rounded-2xl light-glass-panel border border-white/85 dark:border-white/10 shadow-xs overflow-hidden p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
            <h3 className="text-xs font-black text-[#1F1F1F] dark:text-slate-100 tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear} Chronological Agenda
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Showing {filteredDeals.length} scheduled pipeline touches
            </span>
          </div>

          <div className="space-y-2">
            {filteredDeals
              .slice()
              .sort((a, b) => {
                // Sort by year → month → day → timeSlot
                if (a.scheduledYear !== b.scheduledYear) return a.scheduledYear - b.scheduledYear;
                if (a.scheduledMonth !== b.scheduledMonth) return a.scheduledMonth - b.scheduledMonth;
                return a.scheduledDay - b.scheduledDay;
              })
              .map((deal) => (
              <div
                key={deal.id}
                onClick={() => onSelectDeal(deal)}
                style={{
                  borderLeftColor: deal.stageAccent,
                  borderLeftWidth: '3.5px',
                }}
                className="p-2.5 rounded-xl liquid-glass-tile hover:bg-white/90 dark:hover:bg-slate-800/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-500/30 text-[#0284c7] dark:text-sky-400 font-black text-center shrink-0 min-w-[55px]">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {MONTH_NAMES[deal.scheduledMonth].slice(0, 3)}
                    </div>
                    <div className="text-sm font-black">{deal.scheduledDay}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-sky-400 transition-colors">
                        {deal.name}
                      </span>
                      <span
                        className={`text-[8.5px] px-1.5 py-0.5 rounded-md ${getServiceBadgeClass(
                          deal.serviceColor
                        )}`}
                      >
                        {deal.service}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} className="text-slate-400" />
                        {deal.timeSlot}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} className="text-[#1878B8]" />
                        {deal.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${deal.stagePillClass}`}
                  >
                    {deal.stageTitle}
                  </span>
                  {canViewFinances ? (
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">${deal.value.toLocaleString()}</span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">—</span>
                  )}
                  <Eye size={13} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Color Legend */}
      <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600 dark:text-slate-400">
        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Stage Legend:</span>
        <div className="flex flex-wrap items-center gap-3">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-1.5">
              <span
                style={{ backgroundColor: col.accentColor }}
                className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">{col.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
