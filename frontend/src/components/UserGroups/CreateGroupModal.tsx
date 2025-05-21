import React, { useState } from 'react';
import { CreateGroupData } from '../../types';

interface CreateGroupModalProps {
  newUserGroup: CreateGroupData;
  setUserNewGroup: React.Dispatch<React.SetStateAction<CreateGroupData>>;
  onClose: () => void;
  onCreateGroup: () => Promise<boolean>;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  newUserGroup,
  setUserNewGroup,
  onClose,
  onCreateGroup
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserGroup.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = await onCreateGroup();
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
          <h2>Crear Nuevo Grupo</h2>
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
            <label htmlFor="group-name">Nombre del grupo</label>
            <input
              id="group-name"
              type="text"
              value={newUserGroup.name}
              onChange={e => setUserNewGroup({...newUserGroup, name: e.target.value})}
              placeholder="Nombre del grupo"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="group-description">Descripción (opcional)</label>
            <textarea
              id="group-description"
              value={newUserGroup.description || ''}
              onChange={e => setUserNewGroup({...newUserGroup, description: e.target.value})}
              placeholder="Descripción del grupo"
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
              disabled={!newUserGroup.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;