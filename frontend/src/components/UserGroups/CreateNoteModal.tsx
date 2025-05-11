import React from 'react';
import { CreateGroupNoteData } from '../../types';

interface CreateNoteModalProps {
  newNote: CreateGroupNoteData;
  setNewNote: React.Dispatch<React.SetStateAction<CreateGroupNoteData>>;
  onClose: () => void;
  onCreateNote: () => void;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  newNote,
  setNewNote,
  onClose,
  onCreateNote
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateNote();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Crear Nueva Nota</h2>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="note-title">Título</label>
            <input
              id="note-title"
              type="text"
              value={newNote.title}
              onChange={e => setNewNote({...newNote, title: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="note-content">Contenido</label>
            <textarea
              id="note-content"
              value={newNote.content}
              onChange={e => setNewNote({...newNote, content: e.target.value})}
              required
            />
          </div>
          
          <div className="modal-actions">
            <button 
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="create-btn"
            >
              Crear Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;