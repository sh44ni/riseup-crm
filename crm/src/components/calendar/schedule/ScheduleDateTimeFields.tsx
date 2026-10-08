import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { START_TIME_OPTIONS, END_TIME_OPTIONS } from './types';
import { CrmDatePicker } from '@/components/common/CrmDatePicker';
import { CrmSelect } from '@/components/common/CrmSelect';

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
        <CrmDatePicker
          value={dateStr}
          onChange={onDateChange}
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
        <CrmSelect
          value={startTime}
          onChange={onStartTimeChange}
          options={START_TIME_OPTIONS}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
          <Clock size={12} className="text-slate-400" />
          <span>End Time</span>
        </label>
        <CrmSelect
          value={endTime}
          onChange={onEndTimeChange}
          options={END_TIME_OPTIONS}
        />
      </div>
    </div>
  );
}
