import React from 'react';

interface GroupModalProps {
  newGroup: { name: string; color: string };
  setNewGroup: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>;
  onClose: () => void;
  onCreateGroup: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({
  newGroup,
  setNewGroup,
  onClose,
  onCreateGroup
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Crear nuevo grupo</h2>
        <div className="form-group">
          <label>Nombre del grupo</label>
          <input
            type="text"
            value={newGroup.name}
            onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ingrese el nombre del grupo"
          />
        </div>
        <div className="form-group">
          <label>Color del grupo</label>
          <input
            type="color"
            value={newGroup.color}
            onChange={(e) => setNewGroup(prev => ({ ...prev, color: e.target.value }))}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={onCreateGroup}>Crear grupo</button>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;
