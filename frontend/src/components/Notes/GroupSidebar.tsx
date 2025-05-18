import React from 'react';
import { Group } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import TrashSidebar from './TrashSidebar';

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
  const navigate = useNavigate();
  const location = useLocation();
  const isTrashActive = location.pathname === '/trash';

  // Función para manejar la selección de grupos
  const handleGroupClick = (groupId: string) => {
    // Si el grupo no es "trash", usamos la función proporcionada por el padre
    onGroupSelect(groupId);
  };

  // Función para manejar la selección de la papelera
  const handleTrashSelect = () => {
    // Solo navegamos a la papelera si no estamos ya en ella
    if (!isTrashActive) {
      navigate('/trash');
    }
  };

  return (
    <div className="notes-sidebar">
      <div className="group-list">
        {/* Elemento "Todas las notas" */}
        <div 
          key="group-main"
          className={`group-item ${activeGroup === 'main' && !isTrashActive ? 'active' : ''}`}
          onClick={() => handleGroupClick('main')}
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
          .map((group) => (
          <div 
            key={`group-${group.id}`}
            className={`group-item ${activeGroup === group.id && !isTrashActive ? 'active' : ''}`}
            onClick={() => handleGroupClick(group.id)}
          >
            <div 
              className="group-color" 
              style={{ backgroundColor: group.color }}
            />
            <span className="group-name">{group.name}</span>
            {!group.isDefault && (
              <button 
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation(); // Evitamos la propagación del clic
                  onDeleteGroup(group.id, e);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        ))}

        <div className="mt-4 border-t pt-2">
          <TrashSidebar 
            onTrashSelect={handleTrashSelect} 
            isActive={isTrashActive}
          />
        </div>
      </div>
    </div>
  );
};

export default GroupSidebar;
