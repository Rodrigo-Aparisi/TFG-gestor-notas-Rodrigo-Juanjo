import React, { useEffect, useRef } from 'react';
import { Note, Group } from '../../types';
import ShareNote from './ShareNote';
import NoteImage from './NoteImage';

interface NoteCardProps {
  note: Note;
  editingNote: { [key: string]: { title: string; content: string } };
  focusedNoteId: string | null;
  sharingNoteId: string | null;
  isMarked: boolean;
  activeGroup: string;
  groups: Group[];
  handleNoteChange: (id: string, field: 'title' | 'content', value: string) => void;
  handleUpdateNote: (id: string, field: 'title' | 'content') => Promise<void>;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  handleToggleMark: (id: string, event: React.MouseEvent) => Promise<void>;
  handleTogglePin: (id: string, event: React.MouseEvent) => Promise<void>;
  setSharingNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string) => void;
  insertList: (noteId: string, type: 'bullet' | 'number') => void;
  handleDeleteNote: (id: string) => Promise<void>;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  handleDeleteImage: (noteId: string, imageIndex: number) => Promise<void>;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  editingNote,
  focusedNoteId,
  sharingNoteId,
  isMarked,
  activeGroup,
  groups,
  handleNoteChange,
  handleUpdateNote,
  handleFocus,
  handleFocusIndicatorClick,
  handleToggleMark,
  handleTogglePin,
  setSharingNoteId,
  handleKeyDown,
  insertList,
  handleDeleteNote,
  autoResizeTextarea,
  handleImageUpload,
  handleDeleteImage
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeGroupColor = groups.find(g => g.id === activeGroup)?.color || '#f1c40f';
  
  // Implementación interna de autoResizeTextarea si no se proporciona como prop
  const resizeTextarea = (element: HTMLTextAreaElement) => {
    if (!element) return;
    
    // Guarda la posición actual del scroll
    const scrollPos = element.scrollTop;
    
    // Resetea la altura para obtener la altura real del contenido
    element.style.height = 'auto';
    
    const parentNote = element.closest('.note-card');
    const isFocused = parentNote?.classList.contains('focused');
    
    if (isFocused) {
      // Para notas enfocadas
      const maxHeight = Math.min(window.innerHeight * 0.6, element.scrollHeight);
      element.style.height = `\${maxHeight}px`;
    } else {
      // Para notas normales
      const newHeight = Math.min(element.scrollHeight, 500);
      element.style.height = `\${newHeight}px`;
    }
    
    // Restaura la posición del scroll
    element.scrollTop = scrollPos;
  };

  // Usar la función proporcionada como prop o la implementación interna
  const resizeTextareaFn = autoResizeTextarea || resizeTextarea;

  // Aplicar resize cuando el componente se monta o cuando cambia el contenido o el estado de foco
  useEffect(() => {
    if (textareaRef.current) {
      resizeTextareaFn(textareaRef.current);
    }
  }, [note.content, focusedNoteId === note.id]);

  // Añadir listener para el resize de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        resizeTextareaFn(textareaRef.current);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
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
          className={`action-button \${note.is_marked ? 'marked' : ''}`}
          onClick={(e) => handleToggleMark(note.id, e)}
          title={note.is_marked ? 'Desmarcar nota' : 'Marcar nota'}
        >
          <i className="fas fa-check-circle"></i>
        </button>
        <button 
          className={`action-button \${note.is_pinned ? 'pinned' : ''}`}
          onClick={(e) => handleTogglePin(note.id, e)}
          title={note.is_pinned ? 'Desfijar nota' : 'Fijar nota'}
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
          value={editingNote[note.id]?.title ?? note.title}
          onChange={e => handleNoteChange(note.id, 'title', e.target.value)}
          onBlur={() => handleUpdateNote(note.id, 'title')}
          onClick={e => e.stopPropagation()}
        />
        
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
            resizeTextareaFn(e.target as HTMLTextAreaElement);
          }}
          onKeyDown={(e) => handleKeyDown(e, note.id)}
          onInput={(e) => resizeTextareaFn(e.target as HTMLTextAreaElement)}
          onBlur={() => handleUpdateNote(note.id, 'content')}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="note-actions-bottom">
        <div className="list-buttons">
          <button 
            className="list-button"
            onClick={(e) => {
              e.stopPropagation();
              insertList(note.id, 'bullet');
            }}
            title="Insertar lista con viñetas"
          >
            <i className="fas fa-list-ul"></i>
          </button>
          <button 
            className="list-button"
            onClick={(e) => {
              e.stopPropagation();
              insertList(note.id, 'number');
            }}
            title="Insertar lista numerada"
          >
            <i className="fas fa-list-ol"></i>
          </button>
          <button 
            className="list-button"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(`image-input-\${note.id}`)?.click();
            }}
            title="Insertar imagen"
          >
            <i className="fas fa-image"></i>
          </button>
          <input
            id={`image-input-\${note.id}`}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, note.id)}
          />
        </div>
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
