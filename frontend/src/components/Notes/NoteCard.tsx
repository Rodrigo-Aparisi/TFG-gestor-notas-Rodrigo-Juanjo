import React, { useEffect, useRef } from 'react';
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
  const isMarked = markedNotes.includes(note.id);
  const activeGroupColor = groups.find(g => g.id === activeGroup)?.color || '#f1c40f';

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
        borderColor: activeGroup !== 'main' ? activeGroupColor : '#ccc',
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
          onBlur={() => handleUpdateNote(note.id, 'title')}
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
          onBlur={() => handleUpdateNote(note.id, 'content')}
          onClick={(e) => e.stopPropagation()}
        />
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
            handleDeleteNote(note.id);
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

export default NoteCard;
