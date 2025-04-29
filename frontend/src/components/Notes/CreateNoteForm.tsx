import React from 'react';
import NoteImage from './NoteImage';

interface CreateNoteFormProps {
  newNote: { title: string; content: string; images: string[] };
  isExpanded: boolean;
  isLoading: boolean;
  setNewNote: React.Dispatch<React.SetStateAction<{ title: string; content: string; images: string[] }>>;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateNote: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote?: boolean) => void;
  insertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
}

const CreateNoteForm: React.FC<CreateNoteFormProps> = ({
  newNote,
  isExpanded,
  isLoading,
  setNewNote,
  setIsExpanded,
  handleCreateNote,
  handleKeyDown,
  insertList,
  handleImageUpload,
  autoResizeTextarea
}) => {
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
            onKeyDown={e => handleKeyDown(e, '', true)}
            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
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
                      images: prev.images.filter((_, i) => i !== index)
                    }));
                  }}
                />
              ))}
            </div>
          )}
          
          <div className="button-container">
            <div className="left-actions">
              <button 
                className="list-button"
                onClick={() => insertList('', 'bullet', true)}
                title="Insertar lista con viñetas"
              >
                <i className="fas fa-list-ul"></i>
              </button>
              <button 
                className="list-button"
                onClick={() => insertList('', 'number', true)}
                title="Insertar lista numerada"
              >
                <i className="fas fa-list-ol"></i>
              </button>
              <button 
                className="list-button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('image-input-new')?.click();
                }}
                title="Insertar imagen"
              >
                <i className="fas fa-image"></i>
              </button>
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

export default CreateNoteForm;
