import React, { useState } from 'react';
import { CreateGroupNoteData } from '../../types';

interface CreateNoteModalProps {
  newNote: CreateGroupNoteData;
  setNewNote: React.Dispatch<React.SetStateAction<CreateGroupNoteData>>;
  onClose: () => void;
  onCreateNote: () => Promise<boolean>;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  newNote,
  setNewNote,
  onClose,
  onCreateNote
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = await onCreateNote();
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Crear Nueva Nota</h2>
          <button 
            className="close-modal-btn"
            onClick={onClose}
            disabled={isSubmitting}
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
              onChange={e => setNewNote(prev => ({...prev, title: e.target.value}))}
              placeholder="Título de la nota"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="note-content">Contenido</label>
            <textarea
              id="note-content"
              value={newNote.content}
              onChange={e => setNewNote(prev => ({...prev, content: e.target.value}))}
              placeholder="Contenido de la nota"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="modal-actions">
            <button 
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="create-btn"
              disabled={!newNote.title.trim() || !newNote.content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creando...' : 'Crear Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;