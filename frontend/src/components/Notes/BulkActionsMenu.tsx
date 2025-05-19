import React from 'react';
import { Group } from '../../types';

interface BulkActionsMenuProps {
  markedNotes: string[];
  groups: Group[];
  activeGroup: string;
  onShowGroupModal: () => void;
  onDeleteMarkedNotes: () => void;
  onAddToGroup: (groupId: string) => void;
  onRemoveFromGroup: (groupId: string) => void;
}

const BulkActionsMenu: React.FC<BulkActionsMenuProps> = ({ 
  markedNotes, 
  groups,
  activeGroup,
  onShowGroupModal, 
  onDeleteMarkedNotes,
  onAddToGroup,
  onRemoveFromGroup
}) => {
  if (markedNotes.length === 0) return null;
  
  // Filtrar grupos que no sean el grupo activo ni especiales
  const otherGroups = groups.filter(g => !g.isDefault && g.id !== 'trash' && g.id !== activeGroup);
  
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
        
        {/* Menú desplegable para añadir a grupos existentes */}
        {otherGroups.length > 0 && (
          <div className="dropdown">
            <button className="dropdown-button">
              <i className="fas fa-folder-plus"></i>
              Añadir a grupo
            </button>
            <div className="dropdown-content">
              {otherGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => onAddToGroup(group.id)}
                  style={{borderLeft: `4px solid ${group.color}`}}
                >
                  {group.name}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Opción para eliminar del grupo actual si estamos en un grupo */}
        {activeGroup !== 'main' && activeGroup !== 'trash' && (
          <button 
            className="remove-from-group-button"
            onClick={() => onRemoveFromGroup(activeGroup)}
            title="Eliminar del grupo actual"
          >
            <i className="fas fa-folder-minus"></i>
            Eliminar del grupo
          </button>
        )}
        
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
