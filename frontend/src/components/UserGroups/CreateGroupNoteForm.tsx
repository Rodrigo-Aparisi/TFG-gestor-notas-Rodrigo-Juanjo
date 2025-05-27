import React, { useState } from 'react';
import NoteImage from '../Notes/NoteImage';
import NoteActionsMenu from '../Notes/NoteActionsMenu';
import { CreateGroupNoteData } from '../../types';

interface CreateGroupNoteFormProps {
  newNote: CreateGroupNoteData & { images: string[] };
  isLoading: boolean;
  setNewNote: React.Dispatch<React.SetStateAction<CreateGroupNoteData & { images: string[] }>>;
  handleCreateNote: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote?: boolean) => void;
  insertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  handleExportNote: (format: string, noteId?: string) => void;
}

const CreateGroupNoteForm: React.FC<CreateGroupNoteFormProps> = ({
  newNote,
  isLoading,
  setNewNote,
  handleCreateNote,
  handleKeyDown,
  insertList,
  handleImageUpload,
  autoResizeTextarea,
  handleExportNote
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

          {newNote.images && newNote.images.length > 0 && (
            <div className="note-images">
              {newNote.images.map((imageUrl, index) => (
                <NoteImage
                  key={index}
                  imageUrl={imageUrl}
                  index={index}
                  onDelete={() => {
                    setNewNote(prev => ({
                      ...prev,
                      images: prev.images.filter((_, i) => i !== index)
                    }));
                  }}
                />
              ))}
            </div>
          )}

          <div className="button-container">
            <div className="left-actions">
              <NoteActionsMenu
                isNewNote={true}
                onExport={handleExportNote}
                onInsertList={insertList}
                onImageUpload={() => document.getElementById('image-input-new')?.click()}
              />

              <input
                id="image-input-new"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e, 'new')}
              />
            </div>

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
