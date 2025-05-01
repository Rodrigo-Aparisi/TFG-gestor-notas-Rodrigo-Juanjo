import React from 'react';
import Masonry from 'react-masonry-css';
import SharedNoteCard from './SharedNoteCard';

interface SharedNotesGridProps {
  sharedNotes: any[];
  focusedNoteId: string | null;
  setFocusedNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
}

const SharedNotesGrid: React.FC<SharedNotesGridProps> = ({
  sharedNotes,
  focusedNoteId,
  setFocusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea
}) => {
  const breakpointColumns = {
    default: 5,
    1100: 3,
    768: 2,
    480: 1
  };

  // Función simple para cerrar la nota
  const handleCloseNote = () => {
    if (focusedNoteId) {
      setFocusedNoteId(null);
    }
  };

  return (
    <>
      {/* El overlay con un manejador de clic directo */}
      {focusedNoteId && (
        <div 
          className="overlay active" 
          onClick={handleCloseNote}
        />
      )}
      
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
    </>
  );
};

export default SharedNotesGrid;
