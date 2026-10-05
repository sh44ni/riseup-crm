import React, { useState, useEffect } from 'react';
import {
  Clock,
  Send,
  MessageSquare,
  Loader2,
  Edit2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  formatTimestamp12h,
  serializeProfileNote,
  parseProfileNotes,
  reserializeProfileNotes,
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
  onEditNote?: (
    noteId: string,
    updatedAllNotes: string,
    editedContent: string
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
  onEditNote,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
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

    const previousNotes = localNotes;
    const previousDraft = content;

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
    } catch (err: unknown) {
      console.error('Failed to log profile note:', err);
      // Rollback optimistic update on failure - do NOT appear successful
      setLocalNotes(previousNotes);
      setContent(previousDraft);
      const msg = err instanceof Error ? err.message : 'Failed to save field note to client record. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: ParsedProfileNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed || isSavingEdit) return;

    setIsSavingEdit(true);
    setErrorMessage(null);

    const previousNotes = localNotes;
    const updatedList = localNotes.map((n) =>
      n.id === noteId ? { ...n, content: trimmed } : n
    );
    const serializedAll = reserializeProfileNotes(updatedList);

    setLocalNotes(updatedList);

    try {
      if (onEditNote) {
        await onEditNote(noteId, serializedAll, trimmed);
      }
      setEditingNoteId(null);
      setEditContent('');
    } catch (err: unknown) {
      console.error('Failed to update field note:', err);
      // Rollback on failure
      setLocalNotes(previousNotes);
      const msg = err instanceof Error ? err.message : 'Failed to update field note. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSavingEdit(false);
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

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
          <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error saving note: </span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

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
                {/* Note Card Header: Avatar + Name + Role + 12h Timestamp + Edit Button */}
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
                    {allowAdd && onEditNote && editingNoteId !== note.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="ml-1 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        title="Edit note"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Note Body or Inline Editor */}
                {editingNoteId === note.id ? (
                  <div className="pl-8 pt-1 space-y-2">
                    <textarea
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(note.id);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-sky-400/80 dark:border-sky-500 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/20 resize-none font-medium leading-relaxed"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={!editContent.trim() || isSavingEdit}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#1878B8] hover:bg-sky-600 active:scale-[0.98] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                      >
                        {isSavingEdit ? (
                          <>
                            <Loader2 size={11} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={11} className="stroke-[3]" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line pl-8">
                    {note.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
