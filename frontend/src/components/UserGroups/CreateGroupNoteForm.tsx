import React, { useState } from 'react';
import { CreateGroupNoteData } from '../../types';

interface CreateGroupNoteFormProps {
  newNote: CreateGroupNoteData & { images: string[] };
  isLoading: boolean;
  setNewNote: React.Dispatch<React.SetStateAction<CreateGroupNoteData & { images: string[] }>>;
  handleCreateNote: () => Promise<void>;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
}

const CreateGroupNoteForm: React.FC<CreateGroupNoteFormProps> = ({
  newNote,
  isLoading,
  setNewNote,
  handleCreateNote,
  autoResizeTextarea
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="create-note">
      <input
        type="text"
        placeholder="Añade una nota..."
        value={newNote.title}
        onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
          }
        }}
      />

      {isExpanded && (
        <>
          <textarea
            placeholder="Contenido de la nota..."
            value={newNote.content}
            onChange={e => {
              setNewNote(prev => ({ ...prev, content: e.target.value }));
              autoResizeTextarea(e.target as HTMLTextAreaElement);
            }}
            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
          />

          <div className="button-container">
            <div className="right-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setIsExpanded(false);
                  setNewNote({ title: '', content: '', images: [] });
                }}
              >
                Cancelar
              </button>
              <button 
                className="create-button"
                onClick={() => {
                  handleCreateNote();
                  setIsExpanded(false);
                }}
                disabled={isLoading}
              >
                Crear Nota
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CreateGroupNoteForm;
