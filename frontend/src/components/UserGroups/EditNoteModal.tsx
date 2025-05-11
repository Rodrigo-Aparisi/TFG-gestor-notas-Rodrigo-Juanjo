import React from 'react';
import { GroupNote } from '../../types';

interface EditNoteModalProps {
  note: GroupNote;
  onClose: () => void;
  onUpdateNote: () => void;
  onNoteChange: (field: keyof GroupNote, value: any) => void;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({
  note,
  onClose,
  onUpdateNote,
  onNoteChange
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNote();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Editar Nota</h2>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-note-title">Título</label>
            <input
              id="edit-note-title"
              type="text"
              value={note.title}
              onChange={e => onNoteChange('title', e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-note-content">Contenido</label>
            <textarea
              id="edit-note-content"
              value={note.content}
              onChange={e => onNoteChange('content', e.target.value)}
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
              className="update-btn"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNoteModal;