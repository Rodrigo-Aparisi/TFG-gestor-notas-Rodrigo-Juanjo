import React from 'react';
import Masonry from 'react-masonry-css';
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
  isOwnerOrAdmin,
}) => {
  // Asegurar que notes es un array
  const safeNotes = Array.isArray(notes) ? notes : [];

  // Configuración de las columnas para Masonry
  const breakpointColumnsObj = {
    default: 4,
    1400: 3,
    1100: 2,
    700: 1,
  };

  if (safeNotes.length === 0) {
    return (
      <div className="empty-notes">
        <p>Este grupo no tiene notas</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {safeNotes.map((note) => {
        // Verificar que la nota es válida
        if (!note || !note.id) {
          return null;
        }
        
        return (
          <div
            key={note.id}
            className="note-card"
            style={{ backgroundColor: note.color || '#ffffff' }}
          >
            <div className="note-header">
              <h3>{note.title || "Sin título"}</h3>
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
            {/* Proporcionar un valor predeterminado para content */}
            <div className="note-content">{note.content || "Sin contenido disponible"}</div>
            <div className="note-footer">
              <span>Por: {note.created_by_username || "Usuario"}</span>
              <span>
                {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : "Fecha no disponible"}
              </span>
            </div>
          </div>
        );
      })}
    </Masonry>
  );
};

export default GroupNotesGrid;