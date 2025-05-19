import React from 'react';
import { Group } from '../../types';
import { FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface GroupSidebarProps {
  groups: Group[];
  activeGroup: string;
  onGroupSelect: (groupId: string) => void;
  onDeleteGroup: (groupId: string, event: React.MouseEvent) => void;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
}

const GroupSidebar: React.FC<GroupSidebarProps> = ({ 
  groups, 
  activeGroup, 
  onGroupSelect, 
  onDeleteGroup,
  onMoveGroup
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
          .filter(group => group.id !== 'main') // Filtramos el grupo principal que ya añadimos arriba
          .map((group, index) => (
          <div 
            key={`group-${group.id}`}
            className={`group-item ${activeGroup === group.id ? 'active' : ''}`}
            onClick={() => onGroupSelect(group.id)}
          >
            <div 
              className="group-color" 
              style={{ backgroundColor: group.color }}
            />
            <span className="group-name">{group.name}</span>
            {!group.isDefault && (
              <div className="group-actions">
                {index > 0 && (
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveGroup(group.id, 'up');
                    }}
                  >
                    <FaArrowUp />
                  </button>
                )}
                {index < groups.filter(g => !g.isDefault).length - 1 && (
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveGroup(group.id, 'down');
                    }}
                  >
                    <FaArrowDown />
                  </button>
                )}
                <button 
                  className="action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGroup(group.id, e);
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            )}
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
