import React from 'react';
import { Calendar } from 'lucide-react';
import { CrmDateTimePicker } from '@/components/common/CrmDateTimePicker';

export interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  dealName: string;
  dateTime: string;
  onDateTimeChange: (val: string) => void;
  isScheduling: boolean;
  onConfirm: (skipDate?: boolean) => void;
  onCancel: () => void;
}

export function ScheduleAppointmentModal({
  isOpen,
  dealName,
  dateTime,
  onDateTimeChange,
  isScheduling,
  onConfirm,
  onCancel,
}: ScheduleAppointmentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#0B1320]/96 backdrop-blur-3xl border border-white/90 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] p-6 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center shrink-0">
            <Calendar className="text-sky-600 dark:text-sky-400" size={20} />
          </div>
          <div>
            <div className="font-black text-sm text-slate-800 dark:text-slate-100">Schedule Estimate</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{dealName}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Appointment Date &amp; Time
          </label>
          <CrmDateTimePicker
            value={dateTime}
            onChange={onDateTimeChange}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isScheduling}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(true)}
            disabled={isScheduling}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Move, no date
          </button>
          <button
            type="button"
            onClick={() => onConfirm(false)}
            disabled={!dateTime || isScheduling}
            className="flex-1 py-2 rounded-xl bg-[#1878B8] text-white text-xs font-bold hover:bg-[#1568a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isScheduling ? 'Moving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
