import React from 'react';
import { ProfileNotesFeed } from '@/components/common/ProfileNotesFeed';

export interface DealNotesTabProps {
  notes: string;
  onAddNote: (serializedNote: string, plainContent?: string) => Promise<void>;
  onEditNote?: (noteId: string, updatedAllNotes: string, editedContent?: string) => Promise<void>;
}

export function DealNotesTab({
  notes,
  onAddNote,
  onEditNote,
}: DealNotesTabProps) {
  return (
    <ProfileNotesFeed
      rawNotes={notes}
      title="Roofer &amp; Estimator Field Notes"
      subtitle="Profile-attributed field observations, tile specifications, and project updates."
      onAddNote={onAddNote}
      onEditNote={onEditNote}
      maxHeight="280px"
    />
  );
}
