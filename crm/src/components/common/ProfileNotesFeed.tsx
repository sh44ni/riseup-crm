import React, { useState, useEffect } from 'react';
import {
  Clock,
  Send,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  formatTimestamp12h,
  serializeProfileNote,
  parseProfileNotes,
  getAuthorInitials,
  getAuthorColor,
  cleanseAuthor,
  ParsedProfileNote,
} from '@/lib/noteUtils';

export interface ProfileNotesFeedProps {
  rawNotes?: string | null;
  onAddNote?: (
    serializedNote: string,
    plainContent: string,
    authorInfo: { name: string; role?: string; timestamp: string }
  ) => Promise<void> | void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  quickSnippets?: string[];
  compact?: boolean;
  allowAdd?: boolean;
  maxHeight?: string;
}

const DEFAULT_SNIPPETS = [
  'Spoke with homeowner — discussing proposal tiers',
  'Completed physical roof inspection & drone footage',
  'Waiting on insurance claim adjuster approval',
  'Customer requested callback regarding manufacturer warranty',
  'Contract & financing options finalized',
];

export function ProfileNotesFeed({
  rawNotes,
  onAddNote,
  title = 'Inspection & Field Activity Notes',
  subtitle,
  placeholder = 'Add an inspection update, homeowner request, or field note...',
  quickSnippets = DEFAULT_SNIPPETS,
  compact = false,
  allowAdd = true,
  maxHeight = '320px',
}: ProfileNotesFeedProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localNotes, setLocalNotes] = useState<ParsedProfileNote[]>(() =>
    parseProfileNotes(rawNotes)
  );

  // Sync with incoming external changes
  useEffect(() => {
    setLocalNotes(parseProfileNotes(rawNotes));
  }, [rawNotes]);

  // Current active author resolution with human fallback
  const cleanAuthor = cleanseAuthor(user?.name, user?.role);
  const currentAuthorName = cleanAuthor.name;
  const currentAuthorRole = cleanAuthor.role || 'Owner';
  const currentAuthorInitials = getAuthorInitials(currentAuthorName);
  const currentAuthorColor = getAuthorColor(currentAuthorName);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    const now = new Date();
    const timestampStr = formatTimestamp12h(now);
    const serialized = serializeProfileNote(
      trimmed,
      currentAuthorName,
      currentAuthorRole,
      now
    );

    // Optimistically update local notes in-place
    const optimisticNote: ParsedProfileNote = {
      id: `opt-${Date.now()}`,
      author: currentAuthorName,
      role: currentAuthorRole,
      timestamp: timestampStr,
      content: trimmed,
      initials: currentAuthorInitials,
      avatarUrl: user?.avatar_url,
    };

    setLocalNotes((prev) => [optimisticNote, ...prev]);
    setContent('');

    try {
      if (onAddNote) {
        await onAddNote(serialized, trimmed, {
          name: currentAuthorName,
          role: currentAuthorRole,
          timestamp: timestampStr,
        });
      }
    } catch (err) {
      console.error('Failed to log profile note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {title}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
              {localNotes.length} {localNotes.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          {subtitle && (
            <p className="text-[10.5px] text-slate-400 dark:text-slate-400 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Note Composer */}
      {allowAdd && onAddNote && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/5 p-3 shadow-2xs space-y-2.5">
          {/* Textarea */}
          <div className="relative">
            <textarea
              rows={compact ? 2 : 3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1878B8] focus:ring-2 focus:ring-sky-400/20 resize-none transition-all font-medium leading-relaxed"
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-mono text-slate-600 dark:text-slate-300">⌘/Ctrl+Enter</kbd> to save
            </span>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!content.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1878B8] hover:bg-sky-600 active:scale-[0.98] disabled:opacity-40 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send size={12} className="stroke-[2.5]" />
                  <span>Save Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Profile-Based Notes Stream */}
      <div
        className="space-y-2.5 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {localNotes.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center space-y-1.5">
            <MessageSquare size={22} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">No notes recorded yet</div>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 max-w-sm mx-auto">
              Add inspection observations, homeowner communication notes, or follow-up details above.
            </p>
          </div>
        ) : (
          localNotes.map((note) => {
            const authorColors = getAuthorColor(note.author);
            return (
              <div
                key={note.id}
                className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/90 dark:border-white/10 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-1.5"
              >
                {/* Note Card Header: Avatar + Name + Role + 12h Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[9.5px] shrink-0 shadow-2xs ${authorColors.avatarBg}`}
                    >
                      {note.initials}
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {note.author}
                      </span>
                      {note.role && (
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[9.5px] font-bold shrink-0">
                          {note.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-400 dark:text-slate-400 shrink-0">
                    <Clock size={11} className="text-slate-400 dark:text-slate-400" />
                    <span>{note.timestamp}</span>
                  </div>
                </div>

                {/* Note Body */}
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line pl-8">
                  {note.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
