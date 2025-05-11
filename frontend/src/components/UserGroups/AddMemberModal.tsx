// components/UserGroups/AddMemberModal.tsx
import React, { useState } from 'react';

interface AddMemberModalProps {
  onClose: () => void;
  onAddMember: (username: string) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  onClose,
  onAddMember
}) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onAddMember(username);
      setUsername('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Añadir Miembro</h2>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="member-username">Nombre de usuario o email</label>
            <input
              id="member-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
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
              className="add-btn"
            >
              Añadir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;