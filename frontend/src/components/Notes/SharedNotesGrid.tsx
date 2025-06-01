import React from 'react';
import Masonry from 'react-masonry-css';
import SharedNoteCard from './SharedNoteCard';

interface SharedNotesGridProps {
  sharedNotes: any[];
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  showFeedback?: (message: string) => void;
  insertList?: (noteId: string, type: 'bullet' | 'number') => void;
  handleDeleteSharedImage: (noteId: string, imageIndex: number) => Promise<void>;
  handleAddSharedImage?: (noteId: string, file: File) => Promise<string>;
}

const SharedNotesGrid: React.FC<SharedNotesGridProps> = ({
  sharedNotes,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea,
  showFeedback,
  insertList,
  handleDeleteSharedImage,
  handleAddSharedImage
}) => {
  const breakpointColumns = {
    default: 5,
    1100: 3,
    768: 2,
    480: 1
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
            showFeedback={showFeedback}
            insertList={insertList}
            handleDeleteSharedImage={handleDeleteSharedImage}
            handleAddSharedImage={handleAddSharedImage}
          />
        ))
      ) : (
        <div className="no-notes">No tienes notas compartidas</div>
      )}
    </Masonry>
  );
};

export default SharedNotesGrid;
