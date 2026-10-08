import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, X, Check } from 'lucide-react';

export interface CrmDatePickerProps {
  value: string; // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  includeTime?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
  name?: string;
  id?: string;
}

export function CrmDatePicker({
  value,
  onChange,
  includeTime = false,
  placeholder = 'Select date...',
  disabled = false,
  className = '',
  label,
  minDate,
  maxDate,
  name,
  id,
}: CrmDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // Calendar view state (year & month currently browsed)
  const [viewDate, setViewDate] = useState<Date>(() => parsedDate || new Date());

  // Time state for when includeTime is true
  const [selectedHour, setSelectedHour] = useState<number>(() => parsedDate ? parsedDate.getHours() : 9);
  const [selectedMinute, setSelectedMinute] = useState<number>(() => parsedDate ? parsedDate.getMinutes() : 0);

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
      setSelectedHour(parsedDate.getHours());
      setSelectedMinute(parsedDate.getMinutes());
    }
  }, [parsedDate]);

  // Outside click dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (dayNum: number) => {
    const newDate = new Date(year, month, dayNum, selectedHour, selectedMinute);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');

    if (includeTime) {
      const hh = String(selectedHour).padStart(2, '0');
      const mm = String(selectedMinute).padStart(2, '0');
      onChange(`${y}-${m}-${d}T${hh}:${mm}`);
    } else {
      onChange(`${y}-${m}-${d}`);
      setIsOpen(false);
    }
  };

  const handleApplyTime = (h: number, m: number) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    if (parsedDate) {
      const y = parsedDate.getFullYear();
      const mo = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      onChange(`${y}-${mo}-${d}T${hh}:${mm}`);
    }
  };

  // Generate calendar days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysGrid = useMemo(() => {
    const days: Array<{ day: number; currentMonth: boolean; dateStr: string }> = [];

    // Faded trailing days from previous month
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({ day: d, currentMonth: false, dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, currentMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }

    // Faded leading days for next month to complete row
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, currentMonth: false, dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }

    return days;
  }, [year, month, firstDayWeekday, daysInMonth, prevMonthDays]);

  // Formatted display text
  const displayText = useMemo(() => {
    if (!parsedDate) return null;
    if (includeTime) {
      return parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [parsedDate, includeTime]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const selectedDateStr = useMemo(() => {
    if (!parsedDate) return '';
    return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
  }, [parsedDate]);

  return (
    <div ref={containerRef} className={`relative inline-block w-full select-none ${className}`}>
      {/* Hidden input for form serialization */}
      {name && <input type="hidden" name={name} id={id} value={value || ''} />}

      {label && (
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all shadow-2xs cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          isOpen
            ? 'border-[#1878B8] ring-2 ring-[#1878B8]/20 bg-white dark:bg-slate-900 shadow-sm'
            : 'border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:border-sky-400 hover:bg-white dark:hover:bg-slate-900'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {includeTime ? (
            <Clock size={13} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
          ) : (
            <Calendar size={13} className="text-[#1878B8] dark:text-sky-400 shrink-0" />
          )}
          <span className={`font-semibold truncate ${displayText ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
            {displayText || placeholder}
          </span>
        </div>

        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
            title="Clear date"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {/* Floating Glassmorphic Calendar Popover */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-[99999] w-[290px] rounded-3xl bg-white/95 dark:bg-[#0B1320]/96 backdrop-blur-3xl border border-white/90 dark:border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
              {monthNames[month]} {year}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((item, idx) => {
              const isSelected = item.currentMonth && item.dateStr === selectedDateStr;
              const isToday = item.dateStr === todayStr;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => item.currentMonth && handleSelectDay(item.day)}
                  disabled={!item.currentMonth}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    !item.currentMonth
                      ? 'text-slate-300 dark:text-slate-600 pointer-events-none'
                      : isSelected
                      ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white font-black shadow-xs scale-105'
                      : isToday
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-[#1878B8] dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-500/40'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Time Selector (if includeTime is true) */}
          {includeTime && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  <span>Time</span>
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {selectedHour % 12 || 12}:{String(selectedMinute).padStart(2, '0')} {selectedHour >= 12 ? 'PM' : 'AM'}
                </span>
              </div>

              {/* Quick Time Pills */}
              <div className="flex items-center gap-1.5 justify-between">
                {[
                  { label: '9 AM', h: 9, m: 0 },
                  { label: '11 AM', h: 11, m: 0 },
                  { label: '1 PM', h: 13, m: 0 },
                  { label: '3 PM', h: 15, m: 0 },
                  { label: '5 PM', h: 17, m: 0 },
                ].map((preset) => {
                  const isActive = selectedHour === preset.h && selectedMinute === preset.m;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyTime(preset.h, preset.m)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1878B8] text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate(now);
                handleSelectDay(now.getDate());
              }}
              className="text-xs font-bold text-[#1878B8] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold shadow-2xs hover:brightness-105 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrmDatePicker;
