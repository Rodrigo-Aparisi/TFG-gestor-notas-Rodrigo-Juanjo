import React, { useState, useRef, useEffect } from 'react';
import '../../styles/notes.css';

interface NoteActionsMenuProps {
  noteId?: string;
  isNewNote?: boolean;
  onExport: (format: string, noteId?: string) => void;
  onInsertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  onImageUpload: () => void;
}

// Variable global para almacenar la selección actual
let savedSelection: {start: number, end: number, textareaId: string} | null = null;

const NoteActionsMenu: React.FC<NoteActionsMenuProps> = ({
  noteId = '',
  isNewNote = false,
  onExport,
  onInsertList,
  onImageUpload
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Función para guardar la selección actual
  const saveSelection = () => {
    // Encuentra el textarea correspondiente a esta nota
    let textarea: HTMLTextAreaElement | null = null;
    
    if (isNewNote) {
      textarea = document.querySelector('.create-note textarea');
    } else {
      const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
      if (noteElement) {
        textarea = noteElement.querySelector('textarea');
      }
    }
    
    if (textarea && document.activeElement === textarea) {
      savedSelection = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        textareaId: isNewNote ? 'new' : noteId
      };
      console.log('Selección guardada:', savedSelection);
    }
  };
  
  const handleMouseEnter = (menuName: string) => {
    // Guardar la selección actual cuando se muestra el menú
    saveSelection();
    
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
    }, 300);
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
          onMouseEnter={() => handleMouseEnter('list')}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            className="list-button" 
            title="Listas"
            onMouseEnter={saveSelection} // Guardar selección al entrar al botón
          >
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
          <button 
            className="list-button" 
            title="Exportar"
            onMouseEnter={saveSelection} // Guardar selección al entrar al botón
          >
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

// Exportar tanto el componente como la variable savedSelection
export { savedSelection };
export default NoteActionsMenu;
