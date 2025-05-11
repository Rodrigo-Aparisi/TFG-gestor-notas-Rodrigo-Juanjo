import React from 'react';
import { CreateGroupData } from '../../types';

interface CreateGroupModalProps {
  newGroup: CreateGroupData;
  setNewGroup: React.Dispatch<React.SetStateAction<CreateGroupData>>;
  onClose: () => void;
  onCreateGroup: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  newGroup,
  setNewGroup,
  onClose,
  onCreateGroup
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateGroup();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Crear Nuevo Grupo</h2>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="group-name">Nombre del grupo</label>
            <input
              id="group-name"
              type="text"
              value={newGroup.name}
              onChange={e => setNewGroup({...newGroup, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="group-description">Descripción (opcional)</label>
            <textarea
              id="group-description"
              value={newGroup.description || ''}
              onChange={e => setNewGroup({...newGroup, description: e.target.value})}
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
              Crear Grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;