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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddMember(username);
      setUsername('');
    } finally {
      setIsSubmitting(false);
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
              placeholder="Ingresa un nombre de usuario o email"
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
              className="add-btn"
              disabled={!username.trim() || isSubmitting}
            >
              {isSubmitting ? 'Añadiendo...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;