import React from 'react';
import { Group } from '../../types';
import { FaTrash, FaArrowUp, FaArrowDown, FaEdit } from 'react-icons/fa';

interface GroupSidebarProps {
  groups: Group[];
  activeGroup: string;
  onGroupSelect: (groupId: string) => void;
  onDeleteGroup: (groupId: string, event: React.MouseEvent) => void;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
  onEditGroup: (group: Group, event: React.MouseEvent) => void;
}

const GroupSidebar: React.FC<GroupSidebarProps> = ({ 
  groups, 
  activeGroup, 
  onGroupSelect, 
  onDeleteGroup,
  onMoveGroup,
  onEditGroup
}) => {
  return (
    <div className="notes-sidebar">
      <div className="group-list">
        {/* Elemento "Todas las notas" */}
        <div 
          key="group-main"
          className={`group-item ${activeGroup === 'main' ? 'active' : ''}`}
          onClick={() => onGroupSelect('main')}
        >
          <div 
            className="group-color" 
            style={{ backgroundColor: '#f1c40f' }}
          />
          <span className="group-name">Todas las notas</span>
        </div>

        {/* Grupos */}
        {groups
          .filter(group => !group.isDefault && group.id !== 'trash') // Filtramos grupos predeterminados
          .map((group, index) => (
            <div 
              key={`group-${group.id}`}
              className={`group-item ${activeGroup === group.id ? 'active' : ''}`}
              onClick={() => onGroupSelect(group.id)}
            >
              <div className="group-actions-left">
                <button 
                  className="action-button edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGroup(group, e);
                  }}
                  title="Editar grupo"
                >
                  <FaEdit />
                </button>
              </div>
              
              <div 
                className="group-color" 
                style={{ backgroundColor: group.color }}
              />
              <span className="group-name">{group.name}</span>
              
              <div className="group-actions-right">
                {index > 0 && (
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveGroup(group.id, 'up');
                    }}
                    title="Mover hacia arriba"
                  >
                    <FaArrowUp />
                  </button>
                )}
                {index < groups.filter(g => !g.isDefault && g.id !== 'trash').length - 1 && (
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveGroup(group.id, 'down');
                    }}
                    title="Mover hacia abajo"
                  >
                    <FaArrowDown />
                  </button>
                )}
                <button 
                  className="action-button delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGroup(group.id, e);
                  }}
                  title="Eliminar grupo"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}

        <div className="mt-4 border-t pt-2">
          <div 
            className={`group-item ${activeGroup === 'trash' ? 'active' : ''}`}
            onClick={() => onGroupSelect('trash')}
          >
            <div 
              className="group-color" 
              style={{ backgroundColor: '#e74c3c' }}
            />
            <span className="group-name" style={{ color: '#e74c3c' }}>Papelera</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSidebar;
