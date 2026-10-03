import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { START_TIME_OPTIONS, END_TIME_OPTIONS } from './types';

interface ScheduleDateTimeFieldsProps {
  dateStr: string;
  startTime: string;
  endTime: string;
  errorScheduledDate?: string;
  onDateChange: (d: string) => void;
  onStartTimeChange: (t: string) => void;
  onEndTimeChange: (t: string) => void;
}

export function ScheduleDateTimeFields({
  dateStr,
  startTime,
  endTime,
  errorScheduledDate,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: ScheduleDateTimeFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
          <Calendar size={12} className="text-slate-400" />
          <span>Due Date</span>
        </label>
        <input
          type="date"
          required
          value={dateStr}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-2xs"
        />
        {errorScheduledDate && (
          <p className="text-rose-500 text-xs mt-1">{errorScheduledDate}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
          <Clock size={12} className="text-slate-400" />
          <span>Start Time</span>
        </label>
        <select
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
        >
          {START_TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
          <Clock size={12} className="text-slate-400" />
          <span>End Time</span>
        </label>
        <select
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
        >
          {END_TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
