import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, MessageSquare, FileText, CheckCircle2, Flame, Clock } from 'lucide-react';
import { TimelineEvent } from '@/types/client360Types';
import { useAuth } from '@/context/AuthContext';
import { formatTimestamp12h, cleanseAuthor } from '@/lib/noteUtils';

interface ClientLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<TimelineEvent, 'id'>) => void;
  clientName: string;
  isLostClient?: boolean;
}

export function ClientLogModal({
  isOpen,
  onClose,
  onSave,
  clientName,
  isLostClient,
}: ClientLogModalProps) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const { user } = useAuth();
  const clean = cleanseAuthor(user?.name, user?.role);
  const authorName = clean.name;
  const authorRole = clean.role || 'Owner';

  const [type, setType] = useState<TimelineEvent['type']>(isLostClient ? 'call' : 'note');
  const [title, setTitle] = useState(isLostClient ? 'Win-Back Outreach Call' : 'Homeowner Follow-Up');
  const [details, setDetails] = useState('');
  const [sentiment, setSentiment] = useState<TimelineEvent['sentiment']>('neutral');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;

    onSave({
      type,
      title: title.trim() || 'Log Entry',
      date: formatTimestamp12h(new Date()),
      author: `${authorName} (${authorRole})`,
      details: details.trim(),
      sentiment,
    });
    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-lg shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-sky-50/50 dark:from-sky-950/20 to-white dark:to-transparent">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isLostClient ? 'Log Win-Back / Client Touchpoint' : `Log Note or Call: ${clientName}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Records will be added to the unified 360 client audit trail.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Interaction Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setType('call'); setTitle(isLostClient ? 'Win-Back Call' : 'Phone Call'); }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'call'
                    ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <Phone size={13} />
                <span>Call</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('sms'); setTitle('SMS Message'); }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'sms'
                    ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <MessageSquare size={13} />
                <span>Text / SMS</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('note'); setTitle('Internal Site Note'); }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'note'
                    ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <FileText size={13} />
                <span>Note</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              placeholder="e.g. Discussed valley repair timeline"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Detailed Discussion / Notes</label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              placeholder="Spoke with homeowner regarding quote terms, color selection, or win-back re-inspection..."
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Outcome / Sentiment</label>
            <div className="flex items-center gap-2">
              {(['positive', 'neutral', 'negative'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSentiment(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer ${
                    sentiment === s
                      ? s === 'positive'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
                        : s === 'negative'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/60'
                        : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700/60'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white text-xs font-bold shadow-xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              Save to Timeline
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
