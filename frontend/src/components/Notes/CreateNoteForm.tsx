import React from 'react';
import NoteImage from './NoteImage';
import NoteActionsMenu from './NoteActionsMenu';

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
  handleFormatText: (noteId: string, format: string, isNewNote?: boolean) => void;
  handleExportNote: (format: string, noteId?: string) => void;
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
  autoResizeTextarea,
  handleFormatText,
  handleExportNote
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
              {/* Reemplazar los botones individuales con el menú desplegable */}
              <NoteActionsMenu
                isNewNote={true}
                onFormat={handleFormatText}
                onExport={handleExportNote}
                onInsertList={insertList}
                onImageUpload={() => document.getElementById('image-input-new')?.click()}
              />
              
              {/* Mantener oculto el input de imagen */}
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
