import React from 'react';
import Masonry from 'react-masonry-css';
import { Note, Group } from '../../types';
import NoteCard from './NoteCard';

interface NotesGridProps {
  notes: Note[];
  editingNote: { [key: string]: { title: string; content: string } };
  focusedNoteId: string | null;
  sharingNoteId: string | null;
  markedNotes: string[];
  activeGroup: string;
  groups: Group[];
  handleNoteChange: (id: string, field: 'title' | 'content', value: string) => void;
  handleUpdateNote: (id: string, field: 'title' | 'content') => Promise<void>;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  handleToggleMark: (id: string, event: React.MouseEvent) => Promise<void>;
  handleTogglePin: (id: string, event: React.MouseEvent) => Promise<void>;
  setSharingNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  setFocusedNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string) => void;
  insertList: (noteId: string, type: 'bullet' | 'number') => void;
  handleDeleteNote: (id: string) => Promise<void>;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  handleDeleteImage: (noteId: string, imageIndex: number) => Promise<void>;
}

const NotesGrid: React.FC<NotesGridProps> = ({
  notes,
  editingNote,
  focusedNoteId,
  sharingNoteId,
  markedNotes,
  activeGroup,
  groups,
  handleNoteChange,
  handleUpdateNote,
  handleFocus,
  handleFocusIndicatorClick,
  handleToggleMark,
  handleTogglePin,
  setSharingNoteId,
  setFocusedNoteId,
  handleKeyDown,
  insertList,
  handleDeleteNote,
  autoResizeTextarea,
  handleImageUpload,
  handleDeleteImage
}) => {
  const breakpointColumns = {
    default: 5, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
  };

  return (
    <>
      {/* Overlay para cerrar la nota al hacer clic fuera */}
      <div 
        className={`overlay \${focusedNoteId ? 'active' : ''}`} 
        onClick={(e) => {
          // Asegurarse de que el clic fue directamente en el overlay y no en un elemento hijo
          if (e.target === e.currentTarget) {
            setFocusedNoteId(null);
          }
        }}
      />
      
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {notes.length > 0 ? (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              editingNote={editingNote}
              focusedNoteId={focusedNoteId}
              sharingNoteId={sharingNoteId}
              isMarked={markedNotes.includes(note.id)}
              activeGroup={activeGroup}
              groups={groups}
              handleNoteChange={handleNoteChange}
              handleUpdateNote={handleUpdateNote}
              handleFocus={handleFocus}
              handleFocusIndicatorClick={handleFocusIndicatorClick}
              handleToggleMark={handleToggleMark}
              handleTogglePin={handleTogglePin}
              setSharingNoteId={setSharingNoteId}
              handleKeyDown={handleKeyDown}
              insertList={insertList}
              handleDeleteNote={handleDeleteNote}
              autoResizeTextarea={autoResizeTextarea}
              handleImageUpload={handleImageUpload}
              handleDeleteImage={handleDeleteImage}
            />
          ))
        ) : (
          <div className="no-notes">No hay notas para mostrar</div>
        )}
      </Masonry>
    </>
  );
};

export default NotesGrid;
