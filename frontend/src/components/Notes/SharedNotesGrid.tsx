import React from 'react';
import Masonry from 'react-masonry-css';
import SharedNoteCard from './SharedNoteCard';

interface SharedNotesGridProps {
  sharedNotes: any[]; // Tipo para las notas compartidas
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
}

const SharedNotesGrid: React.FC<SharedNotesGridProps> = ({
  sharedNotes,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea
}) => {
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
      {sharedNotes.length > 0 ? (
        sharedNotes.map(note => (
          <SharedNoteCard
            key={note.id}
            note={note}
            focusedNoteId={focusedNoteId}
            handleFocus={handleFocus}
            handleFocusIndicatorClick={handleFocusIndicatorClick}
            autoResizeTextarea={autoResizeTextarea}
          />
        ))
      ) : (
        <div className="no-notes">No tienes notas compartidas</div>
      )}
    </Masonry>
  );
};

export default SharedNotesGrid;
