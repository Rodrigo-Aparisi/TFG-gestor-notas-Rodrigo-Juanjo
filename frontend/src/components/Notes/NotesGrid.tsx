import React from 'react';
import Masonry from 'react-masonry-css';
import { Note } from '../../types';
import NoteCard from './NoteCard';

// Simplified interface - context provides all handlers
interface NotesGridProps {
  notes: Note[];
  isLoading?: boolean;
}

const NotesGrid: React.FC<NotesGridProps> = ({ notes, isLoading }) => {
  const breakpointColumns = {
    default: 5, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
  };

  if (isLoading) {
    return (
      <div className="notes-grid-skeleton" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="note-card-skeleton animate-pulse"
            style={{
              width: '200px',
              height: '160px',
              borderRadius: '8px',
              backgroundColor: '#e0e0e0',
            }}
          />
        ))}
      </div>
    );
  }

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
