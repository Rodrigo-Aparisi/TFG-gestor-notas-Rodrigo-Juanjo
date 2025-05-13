import React, { useState, useRef, useEffect } from 'react';
import '../../styles/notes.css';

interface NoteActionsMenuProps {
  noteId?: string;
  isNewNote?: boolean;
  onFormat: (format: string, noteId?: string, isNewNote?: boolean) => void;
  onExport: (format: string, noteId?: string) => void;
  onInsertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  onImageUpload: () => void;
}

const NoteActionsMenu: React.FC<NoteActionsMenuProps> = ({
  noteId = '',
  isNewNote = false,
  onFormat,
  onExport,
  onInsertList,
  onImageUpload
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const handleMouseEnter = (menuName: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveMenu(menuName);
  };
  
  const handleMouseLeave = () => {
    // Añadir un retraso antes de cerrar el menú
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 500); // 500ms de retraso
  };
  
  // Detectar si el cursor está sobre el menú desplegable
  const handleDropdownMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="note-actions-menu" ref={menuRef}>
      <div className="menu-grid">
        <div 
          className="menu-item-container"
          onMouseEnter={() => handleMouseEnter('format')}
          onMouseLeave={handleMouseLeave}
        >
          <button className="list-button" title="Formato de texto">
            <i className="fas fa-text-height"></i>
          </button>
          
          {activeMenu === 'format' && (
            <div 
              className="menu-dropdown"
              ref={dropdownRef}
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="menu-item" onClick={() => onFormat('bold', noteId, isNewNote)}>
                <i className="fas fa-bold"></i> Negrita
              </div>
              <div className="menu-item" onClick={() => onFormat('italic', noteId, isNewNote)}>
                <i className="fas fa-italic"></i> Cursiva
              </div>
              <div className="menu-item" onClick={() => onFormat('underline', noteId, isNewNote)}>
                <i className="fas fa-underline"></i> Subrayado
              </div>
              <div className="menu-item color-menu">
                <span><i className="fas fa-palette"></i> Color</span>
                <div className="color-options">
                  <div className="color-option red" onClick={() => onFormat('color-red', noteId, isNewNote)}></div>
                  <div className="color-option blue" onClick={() => onFormat('color-blue', noteId, isNewNote)}></div>
                  <div className="color-option green" onClick={() => onFormat('color-green', noteId, isNewNote)}></div>
                  <div className="color-option yellow" onClick={() => onFormat('color-yellow', noteId, isNewNote)}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div 
          className="menu-item-container"
          onMouseEnter={() => handleMouseEnter('list')}
          onMouseLeave={handleMouseLeave}
        >
          <button className="list-button" title="Listas">
            <i className="fas fa-list"></i>
          </button>
          
          {activeMenu === 'list' && (
            <div 
              className="menu-dropdown"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="menu-item" onClick={() => onInsertList(noteId, 'bullet', isNewNote)}>
                <i className="fas fa-list-ul"></i> Lista con viñetas
              </div>
              <div className="menu-item" onClick={() => onInsertList(noteId, 'number', isNewNote)}>
                <i className="fas fa-list-ol"></i> Lista numerada
              </div>
            </div>
          )}
        </div>
        
        <div 
          className="menu-item-container"
          onMouseEnter={() => handleMouseEnter('export')}
          onMouseLeave={handleMouseLeave}
        >
          <button className="list-button" title="Exportar">
            <i className="fas fa-file-export"></i>
          </button>
          
          {activeMenu === 'export' && (
            <div 
              className="menu-dropdown"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="menu-item" onClick={() => onExport('pdf', noteId)}>
                <i className="fas fa-file-pdf"></i> PDF
              </div>
              <div className="menu-item" onClick={() => onExport('txt', noteId)}>
                <i className="fas fa-file-alt"></i> TXT
              </div>
              <div className="menu-item" onClick={() => onExport('html', noteId)}>
                <i className="fas fa-file-code"></i> HTML
              </div>
            </div>
          )}
        </div>
        
        <div className="menu-item-container">
          <button 
            className="list-button"
            onClick={onImageUpload}
            title="Insertar imagen"
          >
            <i className="fas fa-image"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteActionsMenu;
