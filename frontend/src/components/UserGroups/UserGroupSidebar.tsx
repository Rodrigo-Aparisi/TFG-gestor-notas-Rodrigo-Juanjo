import React, { useEffect, useState } from "react";
import { Group } from "../../types";
import { FaEdit } from "react-icons/fa";

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
  onEditGroupDescription,
}) => {
  // Mantener una copia local de los grupos para asegurar que los cambios se reflejan
  const [localGroups, setLocalGroups] = useState<Group[]>(groups);
  
  // Actualizar los grupos locales cuando cambian los props
  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  return (
    <div className="notes-sidebar">
      <div className="group-list" role="listbox" aria-label="Grupos">
        {/* Encabezado del sidebar */}
        <div className="sidebar-header">
          <h2
            onClick={() => onGroupSelect("")}
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onGroupSelect("")}
            style={{ cursor: 'pointer' }}
          >
            Mis Grupos
          </h2>
        </div>
        {/* Grupos */}
        {localGroups
          .filter((group) => !group.isDefault && group.id !== "trash")
          .map((group) => (
            <div
              key={`group-${group.id}`}
              className={`group-item ${
                activeGroup === group.id ? "active" : ""
              }`}
              role="option"
              tabIndex={0}
              aria-selected={activeGroup === group.id}
              onClick={() => onGroupSelect(group.id)}
              onKeyDown={e => e.key === 'Enter' && onGroupSelect(group.id)}
            >
              <div className="group-actions-left">
                <button
                  className="action-button edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGroupName(group.id);
                  }}
                  title="Editar grupo"
                >
                  <FaEdit />
                </button>
              </div>

              <span className="group-name">{group.name}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UserGroupSidebar;
