import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../../types';
import '../../styles/noteSort.css';

interface NoteSortProps {
  notes: Note[];
  onNotesFiltered: (filteredNotes: Note[]) => void;
}

type SortType = 'title' | 'date' | 'pinned';
type SortDirection = 'asc' | 'desc';

const NoteSort: React.FC<NoteSortProps> = ({ notes, onNotesFiltered }) => {
  // Cargar preferencias del localStorage o usar valores por defecto
  const [sortType, setSortType] = useState<SortType>(() => {
    const savedType = localStorage.getItem('notesSortType') as SortType;
    return savedType || 'date';
  });
  
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const savedDirection = localStorage.getItem('notesSortDirection') as SortDirection;
    return savedDirection || 'desc';
  });
  
  const [searchText, setSearchText] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(() => {
    return localStorage.getItem('notesShowSearch') === 'true';
  });
  
  // Estado para controlar la visibilidad del menú desplegable
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Referencia al menú desplegable para detectar clics fuera
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Efecto para cerrar el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // Añadir el event listener cuando el menú está abierto
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Limpiar el event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Guardar preferencias cuando cambien
  useEffect(() => {
    localStorage.setItem('notesSortType', sortType);
    localStorage.setItem('notesSortDirection', sortDirection);
    localStorage.setItem('notesShowSearch', showSearch.toString());
  }, [sortType, sortDirection, showSearch]);

  // Efecto para ordenar las notas cuando cambian
  useEffect(() => {
    sortAndFilterNotes(sortType, sortDirection, searchText);
  }, [notes]);

  const handleSort = (type: SortType) => {
    let newDirection: SortDirection;
    
    if (type === sortType) {
      // Si ya estamos ordenando por este tipo, cambiamos la dirección
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      // Si cambiamos el tipo de ordenación, establecemos la dirección por defecto
      setSortType(type);
      newDirection = 'desc';
      setSortDirection(newDirection);
    }
    
    // Usamos la nueva dirección para ordenar
    sortAndFilterNotes(type, newDirection, searchText);
    
    // Cerramos el menú después de seleccionar
    setIsMenuOpen(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchText(text);
    sortAndFilterNotes(sortType, sortDirection, text);
  };

  const sortAndFilterNotes = (type: SortType, direction: SortDirection, search: string) => {
    let filtered = [...notes];
    
    // Filtrar por texto de búsqueda si existe
    if (search && search.trim()) {
      filtered = filtered.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(search.toLowerCase());
        const contentMatch = note.content ? 
          note.content.toLowerCase().includes(search.toLowerCase()) : 
          false;
        
        return titleMatch || contentMatch;
      });
    }
    
    // Ordenar según el tipo seleccionado
    filtered.sort((a, b) => {
      // Primero ordenamos por pin si está seleccionado
      if (type === 'pinned') {
        if (a.is_pinned && !b.is_pinned) return direction === 'asc' ? 1 : -1;
        if (!a.is_pinned && b.is_pinned) return direction === 'asc' ? -1 : 1;
      }
      
      // Luego por el criterio seleccionado
      if (type === 'title') {
        return direction === 'asc' 
          ? a.title.localeCompare(b.title) 
          : b.title.localeCompare(a.title);
      } else if (type === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Por defecto ordenamos por fecha
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    onNotesFiltered(filtered);
  };

  // Función para mostrar el texto del criterio de ordenación actual
  const getSortTypeText = () => {
    switch (sortType) {
      case 'title': return 'Por título';
      case 'date': return 'Por fecha';
      case 'pinned': return 'Por fijadas';
      default: return 'Ordenar';
    }
  };

  return (
    <div className="note-sort-container">
      {showSearch && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar en notas..."
            value={searchText}
            onChange={handleSearch}
            className="search-input"
          />
          {searchText && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchText('');
                sortAndFilterNotes(sortType, sortDirection, '');
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      )}
      
      <div className="sort-buttons">
        <div className="sort-dropdown" ref={dropdownRef}>
          <button 
            className="sort-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title={`Ordenar por ${sortType === 'title' ? 'título' : sortType === 'date' ? 'fecha' : 'fijadas'}`}
          >
            {getSortTypeText()}
            <i className={`fas fa-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
          </button>
          <div className={`sort-dropdown-content ${isMenuOpen ? 'show' : ''}`}>
            <div 
              className={`sort-item ${sortType === 'title' ? 'active' : ''}`} 
              onClick={() => handleSort('title')}
            >
              Por título
              {sortType === 'title' && (
                <i className={`fas fa-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
              )}
            </div>
            <div 
              className={`sort-item ${sortType === 'date' ? 'active' : ''}`} 
              onClick={() => handleSort('date')}
            >
              Por fecha
              {sortType === 'date' && (
                <i className={`fas fa-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
              )}
            </div>
            <div 
              className={`sort-item ${sortType === 'pinned' ? 'active' : ''}`} 
              onClick={() => handleSort('pinned')}
            >
              Por fijadas
              {sortType === 'pinned' && (
                <i className={`fas fa-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
              )}
            </div>
          </div>
        </div>
        
        <button 
          className="search-button"
          onClick={() => setShowSearch(!showSearch)}
          title={showSearch ? "Ocultar búsqueda" : "Buscar en notas"}
        >
          <i className="fas fa-search"></i>
        </button>
      </div>
    </div>
  );
};

export default NoteSort;
