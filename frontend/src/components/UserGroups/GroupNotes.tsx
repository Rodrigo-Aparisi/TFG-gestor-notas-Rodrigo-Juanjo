import React from 'react';
import { GroupNote } from '../../types';

interface NotesGroupsProps {
  notes: GroupNote[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleTogglePin?: (noteId: string) => void;
}

const NotesGroups: React.FC<NotesGroupsProps> = ({
  notes,
  currentUserId,
  isOwnerOrAdmin,
  onEditNote,
  onDeleteNote,
  handleTogglePin
}) => {
  // Asegurar que notes es un array
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
                  {handleTogglePin && (
                    <button
                      className={`action-button ${note.is_pinned ? 'pinned' : ''}`}
                      onClick={() => handleTogglePin(note.id)}
                    >
                      <i className={`fas fa-thumbtack ${note.is_pinned ? 'pinned' : ''}`}></i>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="note-content">{note.content}</div>
          {note.images && note.images.length > 0 && (
            <div className="note-images">
              {note.images.map((image, index) => (
                <div key={index} className="note-image-container">
                  <img src={image} alt={`Imagen ${index + 1}`} className="note-image" />
                </div>
              ))}
            </div>
          )}
          <div className="note-footer">
            <span>Por: {note.created_by_username}</span>
            <span>{new Date(note.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotesGroups;