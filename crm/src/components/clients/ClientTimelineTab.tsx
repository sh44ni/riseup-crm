import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, Calendar, FileText, Camera, ShieldAlert, CheckCircle2, Clock, Filter, Plus } from 'lucide-react';
import { TimelineEvent } from '@/types/client360Types';
import { getAuthorInitials, getAuthorColor } from '@/lib/noteUtils';

interface ClientTimelineTabProps {
  timeline: TimelineEvent[];
  onLogActivity?: () => void;
}

export function ClientTimelineTab({ timeline, onLogActivity }: ClientTimelineTabProps) {
  const [filter, setFilter] = useState<'all' | 'calls' | 'estimates' | 'inspections'>('all');

  const filtered = timeline.filter((item) => {
    if (filter === 'calls') return item.type === 'call' || item.type === 'sms';
    if (filter === 'estimates') return item.type === 'estimate' || item.type === 'meeting';
    if (filter === 'inspections') return item.type === 'inspection';
    return true;
  });

  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'call':
        return <Phone size={14} className="text-sky-600" />;
      case 'sms':
      case 'note':
        return <MessageSquare size={14} className="text-purple-600" />;
      case 'email':
        return <Mail size={14} className="text-indigo-600" />;
      case 'meeting':
        return <Calendar size={14} className="text-emerald-600" />;
      case 'estimate':
        return <FileText size={14} className="text-amber-600" />;
      case 'inspection':
        return <Camera size={14} className="text-cyan-600" />;
      case 'loss_autopsy':
        return <ShieldAlert size={14} className="text-rose-600" />;
      case 'system':
      default:
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Filter Activity:</span>
          {(['all', 'calls', 'estimates', 'inspections'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === cat
                  ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={onLogActivity}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Log Activity</span>
        </button>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
        {filtered.map((event) => (
          <div key={event.id} className="relative flex items-start gap-4 group">
            {/* Event Dot / Icon */}
            <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-white dark:bg-[#0B1320] border-2 border-slate-300 dark:border-white/20 group-hover:border-[#0284C7] dark:group-hover:border-sky-400 flex items-center justify-center shadow-sm transition-all z-10">
              {getIcon(event.type)}
            </div>

            {/* Event Content Card */}
            <div className="flex-1 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-4 shadow-sm group-hover:shadow-md transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{event.title}</h4>
                  {event.sentiment === 'negative' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                      Risk Logged
                    </span>
                  )}
                  {event.sentiment === 'positive' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      Milestone
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400 dark:text-slate-500" />
                  <span>{event.date}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{event.details}</p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8.5px] ${getAuthorColor(event.author).avatarBg}`}
                  >
                    {getAuthorInitials(event.author)}
                  </div>
                  <span>Logged by: <strong className="text-slate-800 dark:text-slate-200 font-bold">{event.author}</strong></span>
                </div>
                <span className="capitalize text-slate-400 dark:text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[10px]">
                  {event.type.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
