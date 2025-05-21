import React, { useState, useEffect } from 'react';

interface GroupModalProps {
  isEdit?: boolean;
  group?: { id: string; name: string; color: string };
  newGroup: { name: string; color: string };
  setNewGroup: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>;
  onClose: () => void;
  onCreateGroup: () => void;
  onUpdateGroup?: (groupId: string) => void;
}

const GroupModal: React.FC<GroupModalProps> = ({
  isEdit = false,
  group,
  newGroup,
  setNewGroup,
  onClose,
  onCreateGroup,
  onUpdateGroup
}) => {
  // Asegurarnos de que los datos iniciales se establezcan correctamente
  useEffect(() => {
    if (isEdit && group) {
      setNewGroup({
        name: group.name,
        color: group.color
      });
    }
  }, [isEdit, group, setNewGroup]);

  const handleSubmit = () => {
    onCreateGroup(); // Esta función ahora maneja tanto creación como actualización
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{isEdit ? 'Editar grupo' : 'Crear nuevo grupo'}</h2>
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
            <button onClick={handleSubmit}>
              {isEdit ? 'Guardar cambios' : 'Crear grupo'}
            </button>
          </div>
        </div>
      </div>
  );
};

export default GroupModal;
