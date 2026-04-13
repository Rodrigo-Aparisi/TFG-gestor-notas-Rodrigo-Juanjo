import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Note } from '../../types';
import ShareNote from './ShareNote';
import NoteImage from './NoteImage';
import NoteActionsMenu from './NoteActionsMenu';
import { getTimeAgo } from '../../utils/dateFormatter';
import { useNotesContext } from '../../contexts/NotesContext';

// Simplified interface - only note data needed, everything else from context
interface NoteCardProps {
  note: Note;
}

const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
  // Get all handlers and state from context
  const {
    editingNote,
    markedNotes,
    activeGroup,
    groups,
    focusedNoteId,
    sharingNoteId,
    setSharingNoteId,
    handleNoteChange,
    handleUpdateNote,
    handleFocus,
    handleFocusIndicatorClick,
    handleToggleMark,
    handleTogglePin,
    handleKeyDown,
    insertList,
    handleDeleteNote,
    autoResizeTextarea,
    handleImageUpload,
    handleDeleteImage,
    handleExportNote
  } = useNotesContext();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMarked = markedNotes.includes(note.id);
  const activeGroupColor = groups.find(g => g.id === activeGroup)?.color || '#f1c40f';

  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Wrapper que añade indicador visual de guardado
  const handleUpdateNoteWithIndicator = useCallback(async (id: string, field: 'title' | 'content') => {
    setIsSaving(true);
    setSavedOk(false);
    try {
      await handleUpdateNote(id, field);
      setSavedOk(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedOk(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [handleUpdateNote]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Aplicar resize cuando el componente se monta o cuando cambia el contenido o el estado de foco
  useEffect(() => {
    if (textareaRef.current && autoResizeTextarea) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [note.content, focusedNoteId === note.id, autoResizeTextarea]);
  
  return (
    <div 
      key={note.id}
      className={`note-card ${focusedNoteId === note.id ? 'focused' : ''} ${isMarked ? 'marked' : ''}`}
      onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
      style={{
        borderColor: activeGroup !== 'main' ? activeGroupColor : '#ffc600',
        borderWidth: activeGroup !== 'main' ? '2px' : '1px'
      }}
      data-note-id={note.id}
    >
      <div className="note-actions">
        <button 
          className={`action-button ${(note.is_marked || isMarked) ? 'marked' : ''}`}
          onClick={(e) => handleToggleMark(note.id, e)}
          title={(note.is_marked || isMarked) ? 'Desmarcar nota' : 'Marcar nota'}
        >
          <i className="fas fa-check-circle"></i>
        </button>

        <button 
          className={`action-button ${note.is_pinned ? 'pinned' : ''}`}
          onClick={(e) => handleTogglePin(note.id, e)}
          title={note.is_pinned ? 'Desfijar nota' : 'Fijar nota'}
          style={note.is_pinned ? {color: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.1)'} : {}}
        >
          <i className="fas fa-thumbtack"></i>
        </button>
        <button 
          className="action-button"
          onClick={(e) => {
            e.stopPropagation();
            if (!sharingNoteId || sharingNoteId !== note.id) {
              setSharingNoteId(note.id);
            } else {
              setSharingNoteId(null);
            }
          }}
          title="Compartir nota"
        >
          <i className="fas fa-share-alt"></i>
        </button>
      </div>
      <div 
        className="focus-indicator"
        onClick={(e) => handleFocusIndicatorClick(e, note.id)}
      />

      <div className="note-content">
        <input
          type="text"
          value={editingNote[note.id]?.title || note.title || ''}
          onChange={e => handleNoteChange(note.id, 'title', e.target.value)}
          onBlur={() => handleUpdateNoteWithIndicator(note.id, 'title')}
          onClick={e => e.stopPropagation()}
        />
        
        {/* Añadir la fecha de creación aquí */}
        {note.created_at && (
          <div className="note-date">
            {getTimeAgo(note.created_at)}
          </div>
        )}
        
        {/* Sección de imágenes */}
        {note.images && note.images.length > 0 && (
          <div className="note-images">
            {note.images.map((imageUrl, index) => (
              <NoteImage
                key={index}
                imageUrl={imageUrl}
                index={index}
                onDelete={() => handleDeleteImage(note.id, index)}
              />
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={editingNote[note.id]?.content ?? note.content}
          onChange={(e) => {
            handleNoteChange(note.id, 'content', e.target.value);
            autoResizeTextarea && autoResizeTextarea(e.target as HTMLTextAreaElement);
          }}
          onKeyDown={(e) => handleKeyDown(e, note.id)}
          onInput={(e) => autoResizeTextarea && autoResizeTextarea(e.target as HTMLTextAreaElement)}
          onBlur={() => handleUpdateNoteWithIndicator(note.id, 'content')}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Indicador de guardado automático */}
      <div aria-live="polite" aria-atomic="true">
        {isSaving && <div className="saving-indicator">Guardando...</div>}
        {savedOk && !isSaving && <div className="saving-indicator">Guardado ✓</div>}
      </div>

      <div className="note-actions-bottom">
        {/* Reemplazar los botones individuales con el menú desplegable */}
        <NoteActionsMenu
          noteId={note.id}
          onExport={handleExportNote}
          onInsertList={insertList}
          onImageUpload={() => document.getElementById(`image-input-${note.id}`)?.click()}
        />
        
        {/* Mantener oculto el input de imagen */}
        <input
          id={`image-input-${note.id}`}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleImageUpload(e, note.id)}
        />
        
        {/* Mantener el botón de eliminar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) {
              handleDeleteNote(note.id);
            }
          }}
          className="delete-button"
        >
          Eliminar
        </button>
      </div>
      
      {sharingNoteId === note.id && (
        <div className="share-note-section">
          <ShareNote noteId={note.id} />
        </div>
      )}
    </div>
  );
};

// Memoize to prevent re-renders when other notes change
// Only re-render when this specific note's data changes
export default memo(NoteCard, (prevProps, nextProps) => {
  return prevProps.note.id === nextProps.note.id &&
         prevProps.note.title === nextProps.note.title &&
         prevProps.note.content === nextProps.note.content &&
         prevProps.note.updated_at === nextProps.note.updated_at &&
         prevProps.note.is_pinned === nextProps.note.is_pinned &&
         JSON.stringify(prevProps.note.images) === JSON.stringify(nextProps.note.images);
});
