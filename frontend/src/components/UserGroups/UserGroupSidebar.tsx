import React from 'react';
import { UserGroup } from '../../types';

interface UserGroupSidebarProps {
  groups: UserGroup[];
  selectedGroup: UserGroup | null;
  onGroupSelect: (groupId: string) => void;
  onCreateGroup: () => void;
}

const UserGroupSidebar: React.FC<UserGroupSidebarProps> = ({
  groups,
  selectedGroup,
  onGroupSelect,
  onCreateGroup
}) => {
  const safeGroups = Array.isArray(groups) ? groups : [];

  return (
    <div className="groups-sidebar">
      <div className="groups-header">
        <h2>Mis Grupos</h2>
        <button 
          className="create-group-btn"
          onClick={onCreateGroup}
        >
          + Nuevo Grupo
        </button>
      </div>
      
      <div className="groups-list">
        {safeGroups.length === 0 ? (
          <p className="no-groups-message">No tienes grupos creados</p>
        ) : (
          // Usar un fragmento con key para el caso en que haya grupos
          safeGroups.map(group => (
            <div 
              key={group.id} // Esta key ya está correcta
              className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
              onClick={() => onGroupSelect(group.id)}
            >
              <h3>{group.name}</h3>
              <p className="group-members-count">
                {Array.isArray(group.members) ? group.members.length : 0} miembros
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserGroupSidebar;