import React from 'react';
import { FaTrash } from 'react-icons/fa';

interface TrashSidebarProps {
  onTrashSelect: () => void;
  isActive?: boolean;
}

const TrashSidebar: React.FC<TrashSidebarProps> = ({ onTrashSelect, isActive = false }) => {
  return (
    <div 
      className={`group-item ${isActive ? 'active' : ''}`}
      onClick={onTrashSelect}
    >
      <div 
        className="group-color" 
        style={{ backgroundColor: '#e74c3c' }}
      />
      <span className="group-name" style={{ color: '#e74c3c' }}>Papelera</span>
    </div>
  );
};

export default TrashSidebar;
