import React from 'react';
import { GroupNote } from '../../types';

interface GroupNotesGridProps {
  notes: GroupNote[];
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  currentUserId: string;
  isOwnerOrAdmin: boolean;
}

const GroupNotesGrid: React.FC<GroupNotesGridProps> = ({
  notes,
  onEditNote,
  onDeleteNote,
  currentUserId,
  isOwnerOrAdmin
}) => {
  // Asegúrate de que notes sea siempre un array
  const safeNotes = Array.isArray(notes) ? notes : [];
  
  if (safeNotes.length === 0) {
    return (
      <div className="empty-notes">
        <p>Este grupo no tiene notas</p>
      </div>
    );
  }

  return (
    <div className="notes-grid">
      {safeNotes.map(note => (
        <div 
          key={note.id}
          className="note-card"
          style={{ backgroundColor: note.color || '#ffffff' }}
        >
          <div className="note-header">
            <h3>{note.title}</h3>
            <div className="note-actions">
              {(note.user_id === currentUserId || isOwnerOrAdmin) && (
                <>
                  <button
                    className="edit-note-btn"
                    onClick={() => onEditNote(note)}
                  >
                    Editar
                  </button>
                  <button
                    className="delete-note-btn"
                    onClick={() => onDeleteNote(note.id)}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="note-content">{note.content}</div>
          <div className="note-footer">
            <span>Por: {note.created_by_username}</span>
            <span>{new Date(note.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupNotesGrid;