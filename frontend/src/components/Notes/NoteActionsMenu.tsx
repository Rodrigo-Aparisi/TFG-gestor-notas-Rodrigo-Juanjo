import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  
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
    }
  };
  
  // Función para actualizar la posición del menú desplegable
  const updateMenuPosition = (buttonRef: React.RefObject<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };
  
  const handleMouseEnter = (menuName: string, buttonRef: React.RefObject<HTMLButtonElement>) => {
    // Guardar la selección actual cuando se muestra el menú
    saveSelection();
    
    // Actualizar la posición del menú
    updateMenuPosition(buttonRef);
    
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
    }, 500); // 0.5 segundos de retraso
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
          onMouseEnter={() => handleMouseEnter('list', listButtonRef)}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            ref={listButtonRef}
            className="list-button" 
            title="Listas"
            onMouseEnter={saveSelection} // Guardar selección al entrar al botón
          >
            <i className="fas fa-list"></i>
          </button>
          
          {activeMenu === 'list' && ReactDOM.createPortal(
            <div 
              className="portal-menu-dropdown"
              style={{
                position: 'absolute',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                backgroundColor: '#fff',
                boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
                borderRadius: '4px',
                zIndex: 9999,
                minWidth: '180px',
                overflow: 'hidden',
                color: '#333',
                padding: '5px 0'
              }}
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className="menu-item" 
                onClick={() => onInsertList(noteId, 'bullet', isNewNote)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#333',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-list-ul" style={{ marginRight: '10px', width: '16px', color: '#f1c40f' }}></i> 
                Lista con viñetas
              </div>
              <div 
                className="menu-item" 
                onClick={() => onInsertList(noteId, 'number', isNewNote)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#333',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-list-ol" style={{ marginRight: '10px', width: '16px', color: '#f1c40f' }}></i> 
                Lista numerada
              </div>
            </div>,
            document.body
          )}
        </div>
        
        <div 
          className="menu-item-container"
          onMouseEnter={() => handleMouseEnter('export', exportButtonRef)}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            ref={exportButtonRef}
            className="list-button" 
            title="Exportar"
            onMouseEnter={saveSelection} // Guardar selección al entrar al botón
          >
            <i className="fas fa-file-export"></i>
          </button>
          
          {activeMenu === 'export' && ReactDOM.createPortal(
            <div 
              className="portal-menu-dropdown"
              style={{
                position: 'absolute',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                backgroundColor: '#fff',
                boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
                borderRadius: '4px',
                zIndex: 9999,
                minWidth: '180px',
                overflow: 'hidden',
                color: '#333',
                padding: '5px 0'
              }}
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className="menu-item" 
                onClick={() => onExport('pdf', noteId)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#333',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-file-pdf" style={{ marginRight: '10px', width: '16px', color: '#f1c40f' }}></i> 
                PDF
              </div>
              <div 
                className="menu-item" 
                onClick={() => onExport('txt', noteId)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#333',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="fas fa-file-alt" style={{ marginRight: '10px', width: '16px', color: '#f1c40f' }}></i> 
                TXT
              </div>
            </div>,
            document.body
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
