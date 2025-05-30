import React from 'react';
import { GroupNote } from '../../types';
import GroupNoteComponent from './GroupNotes';

interface GroupNotesGridProps {
  notes: GroupNote[];
  currentUserId: string;
  editingNote?: Record<string, GroupNote>;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleNoteChange?: (id: string, field: keyof GroupNote, value: any) => void;
  updateGroupNote?: (id: string, field?: keyof GroupNote) => Promise<boolean>;
}

const GroupNotesGrid: React.FC<GroupNotesGridProps> = ({
  notes,
  currentUserId,
  editingNote,
  onEditNote,
  onDeleteNote,
  handleNoteChange,
  updateGroupNote
}) => {
  // Separar notas fijadas y no fijadas
  const pinnedNotes = notes.filter(note => note.is_pinned);
  const unpinnedNotes = notes.filter(note => !note.is_pinned);

  return (
    <div className="notes-grid">
      {/* Renderizar todas las notas */}
      {notes.map((note) => (
        <GroupNoteComponent
          key={note.id}
          note={note}
          currentUserId={currentUserId}
          editingNote={editingNote}
          onEditNote={onEditNote}
          onDeleteNote={onDeleteNote}
          handleNoteChange={handleNoteChange}
          updateGroupNote={updateGroupNote}
        />
      ))}
      
      {notes.length === 0 && (
        <div className="no-notes-message">
          No hay notas en este grupo. ¡Crea una nueva!
        </div>
      )}
    </div>
  );
};

export default GroupNotesGrid;
