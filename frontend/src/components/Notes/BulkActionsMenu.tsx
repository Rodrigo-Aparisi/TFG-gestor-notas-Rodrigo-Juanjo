import React from 'react';

interface BulkActionsMenuProps {
  markedNotes: string[];
  onShowGroupModal: () => void;
  onDeleteMarkedNotes: () => void;
}

const BulkActionsMenu: React.FC<BulkActionsMenuProps> = ({ 
  markedNotes, 
  onShowGroupModal, 
  onDeleteMarkedNotes 
}) => {
  if (markedNotes.length === 0) return null;
  
  return (
    <div className="bulk-actions-menu visible">
      <div className="left-section">
        <span>
          {markedNotes.length} {markedNotes.length === 1 ? 'nota seleccionada' : 'notas seleccionadas'}
        </span>
      </div>
      <div className="right-section">
        <button 
          className="create-group-button"
          onClick={onShowGroupModal}
          disabled={markedNotes.length === 0}
        >
          <i className="fas fa-layer-group"></i>
          Crear grupo
        </button>
        <button 
          className="bulk-delete-button"
          onClick={onDeleteMarkedNotes}
          title="Eliminar notas seleccionadas"
        >
          <i className="fas fa-trash"></i>
          Eliminar seleccionadas
        </button>
      </div>
    </div>
  );
};

export default BulkActionsMenu;
