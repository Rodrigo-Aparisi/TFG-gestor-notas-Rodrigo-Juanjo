import React from 'react';
import Masonry from 'react-masonry-css';
import SharedNoteCard from './SharedNoteCard';
import { SharedNote } from '../../types';

interface SharedNotesGridProps {
  sharedNotes: SharedNote[];
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  insertList?: (noteId: string, type: 'bullet' | 'number') => void;
  handleDeleteSharedImage?: (noteId: string, imageIndex: number) => Promise<boolean>;
  handleAddSharedImage?: (noteId: string, file: File) => Promise<string>;
  handleExportSharedNote?: (format: string, noteData: string | SharedNote) => void;
}

const SharedNotesGrid: React.FC<SharedNotesGridProps> = ({
  sharedNotes,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea,
  insertList,
  handleDeleteSharedImage,
  handleAddSharedImage,
  handleExportSharedNote
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
            insertList={insertList}
            handleDeleteSharedImage={handleDeleteSharedImage}
            handleAddSharedImage={handleAddSharedImage}
            handleExportSharedNote={handleExportSharedNote}
          />
        ))
      ) : (
        <div className="no-notes">No tienes notas compartidas</div>
      )}
    </Masonry>
  );
};

export default SharedNotesGrid;
