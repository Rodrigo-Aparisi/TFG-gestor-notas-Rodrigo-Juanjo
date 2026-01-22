import React from 'react';
import Masonry from 'react-masonry-css';
import { Note } from '../../types';
import NoteCard from './NoteCard';

// Simplified interface - context provides all handlers
interface NotesGridProps {
  notes: Note[];
}

const NotesGrid: React.FC<NotesGridProps> = ({ notes }) => {
  const breakpointColumns = {
    default: 5, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
  };

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {notes.length > 0 ? (
        notes.map(note => (
          <NoteCard key={note.id} note={note} />
        ))
      ) : (
        <div className="no-notes">No hay notas para mostrar</div>
      )}
    </Masonry>
  );
};

export default NotesGrid;
