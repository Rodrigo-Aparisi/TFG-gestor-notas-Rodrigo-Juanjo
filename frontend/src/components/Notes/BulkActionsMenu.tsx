import React, { useState, useRef, useEffect } from 'react';
import { Group } from '../../types';
import ReactDOM from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Función para actualizar la posición del dropdown
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };
  
  // Función para manejar el inicio del hover
  const handleMouseEnter = () => {
    // Limpiar cualquier temporizador existente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Actualizar posición y mostrar el menú
    updateDropdownPosition();
    setIsHovering(true);
  };
  
  // Función para manejar el fin del hover
  const handleMouseLeave = () => {
    // Añadir un retraso de 0.5 segundos antes de cerrar
    timeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 500); // 500ms = 0.5 segundos
  };
  
  // Actualizar posición cuando cambian las dimensiones
  useEffect(() => {
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      // Limpiar cualquier temporizador pendiente
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
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
          <div 
            className="bulk-dropdown"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              ref={buttonRef}
              className="dropdown-button"
            >
              <i className="fas fa-folder-plus"></i>
              Añadir a grupo
            </button>
            
            {isHovering && ReactDOM.createPortal(
              <div 
                className="portal-dropdown"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                  position: 'absolute',
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  zIndex: 9999,
                  minWidth: '180px',
                  overflow: 'hidden',
                  color: '#333', // Asegurar que el texto sea visible
                  padding: '5px 0' // Añadir padding para mejor apariencia
                }}
              >
                {otherGroups.map(group => (
                  <div 
                    key={group.id} 
                    onClick={() => onAddToGroup(group.id)}
                    style={{
                      padding: '12px 16px',
                      borderLeft: `4px solid ${group.color}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      color: '#333' // Asegurar que el texto sea visible
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {group.name}
                  </div>
                ))}
              </div>,
              document.body
            )}
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
