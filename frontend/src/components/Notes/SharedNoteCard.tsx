import React from 'react';

interface SharedNoteCardProps {
  note: any;
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
}

const SharedNoteCard: React.FC<SharedNoteCardProps> = ({
  note,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea
}) => {
  return (
    <div 
      className={`note-card ${focusedNoteId === note.id ? 'focused' : ''}`}
      onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
      style={{
        backgroundColor: note.color || undefined,
        borderColor: '#ccc',
        borderWidth: '1px'
      }}
    >
      <div 
        className="focus-indicator"
        onClick={(e) => handleFocusIndicatorClick(e, note.id)}
      />
      <div className="note-content">
        <input
          type="text"
          value={note.title || ''}
          readOnly
          onClick={e => e.stopPropagation()}
        />
        <div className="shared-by">
          Compartida por: {note.shared_by || 'Desconocido'}
        </div>
        <textarea
          value={note.content || ''}
          readOnly
          onClick={(e) => e.stopPropagation()}
          ref={(textarea) => {
            if (textarea) {
              autoResizeTextarea(textarea);
            }
          }}
        />
      </div>
    </div>
  );
};

export default SharedNoteCard;
