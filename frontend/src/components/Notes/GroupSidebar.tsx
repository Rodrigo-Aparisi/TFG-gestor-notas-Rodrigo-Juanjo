import React from 'react';
import { Group } from '../../types';

interface GroupSidebarProps {
  groups: Group[];
  activeGroup: string;
  onGroupSelect: (groupId: string) => void;
  onDeleteGroup: (groupId: string, event: React.MouseEvent) => void;
}

const GroupSidebar: React.FC<GroupSidebarProps> = ({ 
  groups, 
  activeGroup, 
  onGroupSelect, 
  onDeleteGroup 
}) => {
  return (
    <div className="notes-sidebar">
      <div className="group-list">
        {groups.map((group) => (
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
              <button 
                className="action-button"
                onClick={(e) => onDeleteGroup(group.id, e)}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupSidebar;
