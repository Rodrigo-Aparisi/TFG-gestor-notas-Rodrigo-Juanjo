import React, { useEffect, useState } from "react";
import { Group } from "../../types";
import { FaEdit, FaInfoCircle } from "react-icons/fa";

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
      <div className="group-list">
        {/* Encabezado del sidebar */}
        <div className="sidebar-header">
          <h2 onClick={() => onGroupSelect("")}>Mis Grupos</h2>
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
              onClick={() => onGroupSelect(group.id)}
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
