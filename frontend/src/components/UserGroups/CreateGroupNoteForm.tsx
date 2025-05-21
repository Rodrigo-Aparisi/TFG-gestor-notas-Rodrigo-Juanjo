import React, { useState } from 'react';
import NoteImage from '../Notes/NoteImage';
import { CreateGroupNoteData } from '../../types';

interface CreateGroupNoteFormProps {
  newNote: CreateGroupNoteData & { images?: string[] };
  isLoading: boolean;
  setNewNote: React.Dispatch<React.SetStateAction<CreateGroupNoteData & { images?: string[] }>>;
  handleCreateNote: () => Promise<boolean>;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
}

const CreateGroupNoteForm: React.FC<CreateGroupNoteFormProps> = ({
  newNote,
  isLoading,
  setNewNote,
  handleCreateNote,
  handleImageUpload,
  autoResizeTextarea
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCancel = () => {
    setNewNote({ title: '', content: '', images: [] });
    setIsExpanded(false);
  };

  const handleCreate = async () => {
    const success = await handleCreateNote();
    if (success) {
      setNewNote({ title: '', content: '', images: [] });
      setIsExpanded(false);
    }
  };

  return (
    <div className="create-note">
      <input
        type="text"
        placeholder="Título de la nota..."
        value={newNote.title}
        onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
      />

      <textarea
        placeholder="Contenido de la nota..."
        value={newNote.content}
        onChange={e => {
          setNewNote(prev => ({ ...prev, content: e.target.value }));
          if (autoResizeTextarea) {
            autoResizeTextarea(e.target as HTMLTextAreaElement);
          }
        }}
        onInput={e => {
          if (autoResizeTextarea) {
            autoResizeTextarea(e.target as HTMLTextAreaElement);
          }
        }}
      />
      
      {/* Sección de imágenes para la nota nueva */}
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
                  images: prev.images ? prev.images.filter((_, i) => i !== index) : []
                }));
              }}
            />
          ))}
        </div>
      )}
      
      <div className="button-container">
        <div className="left-actions">
          {handleImageUpload && (
            <>
              <button 
                className="list-button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('group-image-input-new')?.click();
                }}
                title="Insertar imagen"
              >
                <i className="fas fa-image"></i>
              </button>
              <input
                id="group-image-input-new"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e, 'new')}
              />
            </>
          )}
        </div>
        <div className="right-actions">
          <button 
            className="cancel-button"
            onClick={handleCancel}
          >
            Cancelar
          </button>
          <button 
            className="create-button"
            onClick={handleCreate}
            disabled={isLoading || !newNote.title.trim() || !newNote.content.trim()}
          >
            Crear Nota
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupNoteForm;