import React, { useState } from 'react';
import {
  Plus,
  Loader2,
  Send,
  User,
} from 'lucide-react';
import { formatRelativeTime } from './types';

export interface DealActivity {
  id: string | number;
  title: string;
  activity_type: string;
  description?: string;
  created_at: string;
  performed_by?: string;
  user_name?: string;
}

export interface DealTimelineTabProps {
  activities: DealActivity[];
  onLogTouchpoint: (method: 'call' | 'sms' | 'email' | 'meeting' | 'note', notes: string) => Promise<void>;
}

export function DealTimelineTab({
  activities,
  onLogTouchpoint,
}: DealTimelineTabProps) {
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [logMethod, setLogMethod] = useState<'call' | 'sms' | 'email' | 'meeting' | 'note'>('call');
  const [logNotes, setLogNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleSaveTouchpoint = async () => {
    if (!logNotes.trim() || isLogging) return;
    setIsLogging(true);
    try {
      await onLogTouchpoint(logMethod, logNotes.trim());
      setLogNotes('');
      setShowLogDrawer(false);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      {/* Timeline Header & Quick Log Trigger */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Touchpoint &amp; Stage Movement Stream
        </span>
        <button
          type="button"
          onClick={() => setShowLogDrawer(!showLogDrawer)}
          className="text-xs font-bold text-[#1878B8] hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} />
          <span>{showLogDrawer ? 'Cancel' : 'Log Touchpoint'}</span>
        </button>
      </div>

      {/* Quick Log Inline Box */}
      {showLogDrawer && (
        <div className="p-3.5 rounded-2xl bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 shadow-sm space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {(['call', 'sms', 'email', 'meeting', 'note'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setLogMethod(m)}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] capitalize transition-all cursor-pointer ${
                  logMethod === m
                    ? 'bg-[#1878B8] text-white shadow-2xs'
                    : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/20'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder="Enter touchpoint details or follow-up note..."
            className="w-full text-xs p-2.5 rounded-xl border border-sky-300 dark:border-sky-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-2xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogDrawer(false)}
              className="px-3 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTouchpoint}
              disabled={!logNotes.trim() || isLogging}
              className="px-3 py-1 rounded-lg bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLogging ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              <span>Save Touchpoint</span>
            </button>
          </div>
        </div>
      )}

      {/* Continuous Vertical Timeline */}
      <div className="space-y-4 relative pl-5 border-l-2 border-sky-300/60 dark:border-sky-700/40 ml-2.5">
        {activities.map((act) => {
          const isStageMove = act.activity_type === 'stage_changed';
          const isNote = act.activity_type === 'note';
          const isComm = act.activity_type === 'communication';

          const dotColor = isStageMove
            ? 'bg-amber-500 ring-amber-100 dark:ring-amber-950'
            : isNote
            ? 'bg-purple-500 ring-purple-100 dark:ring-purple-950'
            : isComm
            ? 'bg-sky-500 ring-sky-100 dark:ring-sky-950'
            : 'bg-[#1878B8] ring-sky-100 dark:ring-sky-950';

          return (
            <div key={act.id} className="relative group">
              {/* Node circle */}
              <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ${dotColor}`} />
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  {act.title}
                </div>
                <span className="text-[10px] font-medium text-slate-400 shrink-0">
                  {formatRelativeTime(act.created_at)}
                </span>
              </div>

              {/* Author / Attribution */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <User size={10} className="text-slate-400" />
                <span>By {act.performed_by || act.user_name || 'Staff Member'}</span>
              </div>

              {/* Move Note / Body Description */}
              {act.description && (
                <div
                  className={`mt-1.5 text-[11.5px] p-2.5 rounded-xl border leading-relaxed ${
                    isStageMove
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-200 font-medium'
                      : isNote
                      ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40 text-purple-950 dark:text-purple-200 font-medium'
                      : 'bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {act.description}
                </div>
              )}
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">
            No touchpoints or stage movements recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
