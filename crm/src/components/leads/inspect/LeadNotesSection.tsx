import React, { useState } from 'react';
import { FileText, Send, Loader2 } from 'lucide-react';

interface LeadNotesSectionProps {
  notes?: string;
  onAddNote?: (note: string) => Promise<void> | void;
  onToast: (msg: string) => void;
}

export function LeadNotesSection({ notes, onAddNote, onToast }: LeadNotesSectionProps) {
  const [generalNoteText, setGeneralNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveGeneralNote = async () => {
    const trimmed = generalNoteText.trim();
    if (!trimmed || isSavingNote) return;
    setIsSavingNote(true);
    try {
      if (onAddNote) {
        await onAddNote(trimmed);
        onToast('Note saved');
      }
      setGeneralNoteText('');
    } catch (err: unknown) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-[#1878B8] dark:text-sky-400" />
          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            General Notes
          </span>
        </div>
      </div>

      {/* Note Composer */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/5 p-3 shadow-2xs space-y-2.5">
        <textarea
          rows={3}
          value={generalNoteText}
          onChange={(e) => setGeneralNoteText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSaveGeneralNote();
            }
          }}
          placeholder="Add a general note for this lead..."
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1878B8] dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 resize-none transition-all font-medium leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-mono text-slate-600 dark:text-slate-300">
              ⌘/Ctrl+Enter
            </kbd>{' '}
            to save
          </span>

          <button
            type="button"
            onClick={handleSaveGeneralNote}
            disabled={!generalNoteText.trim() || isSavingNote}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1878B8] hover:bg-sky-600 active:scale-[0.98] disabled:opacity-40 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            {isSavingNote ? (
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

      {/* Existing Notes Display */}
      {notes && notes.trim() ? (
        <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium shadow-2xs max-h-48 overflow-y-auto">
          {notes}
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          No general notes recorded yet
        </div>
      )}
    </div>
  );
}
