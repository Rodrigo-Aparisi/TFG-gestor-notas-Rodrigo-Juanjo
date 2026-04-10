import React from 'react';
import { GroupNote } from '../../types';
import GroupNoteComponent from './GroupNotes';

interface GroupNotesGridProps {
  notes: GroupNote[];
  currentUserId: string;
  isOwnerOrAdmin?: boolean;
  editingNote?: Record<string, GroupNote>;
  focusedNoteId?: string | null;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleTogglePin?: (noteId: string, event?: React.MouseEvent) => void;
  handleToggleMark?: (noteId: string, event: React.MouseEvent) => void;
  handleNoteChange?: (id: string, field: keyof GroupNote, value: string | boolean | string[] | null) => void;
  updateGroupNote?: (id: string, field?: keyof GroupNote) => Promise<boolean>;
  handleFocus?: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick?: (event: React.MouseEvent, id: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string) => void;
  insertList?: (noteId: string, type: 'bullet' | 'number') => void;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => void;
  handleDeleteImage?: (noteId: string, imageIndex: number) => void;
  handleExportNote?: (format: string, noteId?: string) => void;
}

const GroupNotesGrid: React.FC<GroupNotesGridProps> = ({
  notes,
  currentUserId,
  isOwnerOrAdmin,
  editingNote,
  focusedNoteId,
  onEditNote,
  onDeleteNote,
  handleTogglePin,
  handleToggleMark,
  handleNoteChange,
  updateGroupNote,
  handleFocus,
  handleFocusIndicatorClick,
  handleKeyDown,
  insertList,
  autoResizeTextarea,
  handleImageUpload,
  handleDeleteImage,
  handleExportNote,
}) => {
  return (
    <div className="notes-grid">
      {/* Renderizar todas las notas */}
      {notes.map((note) => (
        <GroupNoteComponent
          key={note.id}
          note={note}
          currentUserId={currentUserId}
          isOwnerOrAdmin={isOwnerOrAdmin}
          editingNote={editingNote}
          focusedNoteId={focusedNoteId}
          onEditNote={onEditNote}
          onDeleteNote={onDeleteNote}
          handleTogglePin={handleTogglePin}
          handleToggleMark={handleToggleMark}
          handleNoteChange={handleNoteChange}
          updateGroupNote={updateGroupNote}
          handleFocus={handleFocus}
          handleFocusIndicatorClick={handleFocusIndicatorClick}
          handleKeyDown={handleKeyDown}
          insertList={insertList}
          autoResizeTextarea={autoResizeTextarea}
          handleImageUpload={handleImageUpload}
          handleDeleteImage={handleDeleteImage}
          handleExportNote={handleExportNote}
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
