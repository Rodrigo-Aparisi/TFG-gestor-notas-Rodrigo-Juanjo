import React, { useEffect, useRef } from 'react';
import { GroupNote } from '../../types';

interface NotesGroupsProps {
  notes: GroupNote[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleTogglePin?: (noteId: string) => void;
}

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verificar si es una fecha válida
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString();
};

// Función para mostrar tiempo relativo (hace X tiempo)
const getTimeAgo = (dateString: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verificar si es una fecha válida
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  if (diffSec < 60) {
    return 'hace un momento';
  } else if (diffMin < 60) {
    return `hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`;
  } else if (diffHour < 24) {
    return `hace ${diffHour} hora${diffHour === 1 ? '' : 's'}`;
  } else if (diffDay < 30) {
    return `hace ${diffDay} día${diffDay === 1 ? '' : 's'}`;
  } else {
    // Para fechas más antiguas, mostrar la fecha completa
    return formatDate(dateString);
  }
};

const GroupNoteCard: React.FC<NotesGroupsProps> = ({
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
          data-note-id={note.id}
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
                      title={note.is_pinned ? 'Desfijar nota' : 'Fijar nota'}
                    >
                      <i className={`fas fa-thumbtack ${note.is_pinned ? 'pinned' : ''}`}></i>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="note-content">{note.content}</div>
          
          {/* Sección de imágenes */}
          {note.images && note.images.length > 0 && (
            <div className="note-images">
              {note.images.map((image, index) => (
                <div key={index} className="note-image-container">
                  <img src={image} alt={`Imagen \${index + 1}`} className="note-image" />
                </div>
              ))}
            </div>
          )}
          
          <div className="note-footer">
            <span>Por: {note.created_by_username}</span>
            <span>{getTimeAgo(note.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupNoteCard;