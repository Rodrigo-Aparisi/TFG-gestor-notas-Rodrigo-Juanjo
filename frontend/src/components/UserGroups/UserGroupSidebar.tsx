import React from 'react';
import { Group } from '../../types';
import { FaEdit, FaInfoCircle } from 'react-icons/fa';

interface UserGroupSidebarProps {
  groups: Group[];
  activeGroup: string;
  onGroupSelect: (groupId: string) => void;
  onEditGroupName: (groupId: string) => void;
  onEditGroupDescription: (groupId: string) => void;
}

const UserGroupSidebar: React.FC<UserGroupSidebarProps> = ({ 
  groups, 
  activeGroup, 
  onGroupSelect,
  onEditGroupName,
  onEditGroupDescription
}) => {
  return (
    <div className="notes-sidebar">
      <div className="group-list">
        {/* Encabezado del sidebar */}
        <div className="sidebar-header">
          <h2>Mis Grupos</h2>
        </div>
        {/* Grupos */}
        {groups
          .filter(group => !group.isDefault && group.id !== 'trash') // Filtramos grupos predeterminados
          .map((group) => (
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
                    onEditGroupName(group.id);
                  }}
                  title="Editar nombre del grupo"
                >
                  <FaEdit />
                </button>
              </div>
              
              <div 
                className="group-color" 
                style={{ backgroundColor: group.color || '#3498db' }}
              />
              <span className="group-name">{group.name}</span>
              
              <div className="group-actions-right">
                <button 
                  className="action-button info-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGroupDescription(group.id);
                  }}
                  title="Editar descripción"
                >
                  <FaInfoCircle />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UserGroupSidebar;