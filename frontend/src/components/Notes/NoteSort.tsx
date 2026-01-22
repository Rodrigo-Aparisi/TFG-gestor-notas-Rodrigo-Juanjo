import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, SortType, SortDirection } from '../../types';
import { noteService } from '../../services/api';
import { useClickOutside } from '../../hooks/useClickOutside';
import '../../styles/noteSort.css';
import DateFilter from './DateFilter';

interface NoteSortProps {
  notes: Note[];
  onNotesFiltered: (filteredNotes: Note[]) => void;
}

const NoteSort: React.FC<NoteSortProps> = ({ notes, onNotesFiltered }) => {
  // Estados existentes
  const [sortType, setSortType] = useState<SortType>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchText, setSearchText] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Nuevo estado para filtrado por fecha
  const [dateFilteredNotes, setDateFilteredNotes] = useState<Note[] | null>(null);
  
  // Referencia al menú desplegable
  const dropdownRef = useRef<HTMLDivElement>(null);

  const previousNotesRef = useRef<string>('');
  const previousSortTypeRef = useRef<SortType>('date');
  const previousSortDirectionRef = useRef<SortDirection>('desc');
  const previousSearchTextRef = useRef<string>('');
  const previousDateFilterRef = useRef<string>('');

  // Variables para detectar cambios
  const sortTypeChanged = sortType !== previousSortTypeRef.current;
  const sortDirectionChanged = sortDirection !== previousSortDirectionRef.current;
  const searchTextChanged = searchText !== previousSearchTextRef.current;
  const dateFilterChanged = JSON.stringify(dateFilteredNotes) !== previousDateFilterRef.current;

  // Cargar preferencias del servidor al iniciar
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await noteService.getUserSortPreferences();
        
        if (response.success && response.preferences) {
          // Actualizar estado con las preferencias del servidor
          setSortType(response.preferences.sortType as SortType);
          setSortDirection(response.preferences.sortDirection as SortDirection);
          
          // También guardamos en localStorage como respaldo
          localStorage.setItem('notesSortType', response.preferences.sortType);
          localStorage.setItem('notesSortDirection', response.preferences.sortDirection);
        }
      } catch (error) {
        console.error('Error al cargar preferencias de usuario:', error);
        
        // Si hay error, intentar cargar desde localStorage como respaldo
        const savedType = localStorage.getItem('notesSortType') as SortType;
        const savedDirection = localStorage.getItem('notesSortDirection') as SortDirection;
        const savedShowSearch = localStorage.getItem('notesShowSearch') === 'true';
        
        setSortType(savedType || 'date');
        setSortDirection(savedDirection || 'desc');
        setShowSearch(savedShowSearch);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Cargar preferencias de búsqueda desde localStorage
    const savedShowSearch = localStorage.getItem('notesShowSearch') === 'true';
    setShowSearch(savedShowSearch);
    
    loadUserPreferences();
  }, []);

  // Ordenar notas cuando cambien las preferencias o las notas
  useEffect(() => {
    if (!isLoading && notes.length > 0) {
      // Añadir una comprobación para evitar ordenaciones innecesarias
      const notesChanged = JSON.stringify(notes) !== previousNotesRef.current;
      if (notesChanged || sortTypeChanged || sortDirectionChanged || searchTextChanged || dateFilterChanged) {
        sortAndFilterNotes(sortType, sortDirection, searchText, dateFilteredNotes);
        
        // Actualizar las referencias
        previousNotesRef.current = JSON.stringify(notes);
        previousSortTypeRef.current = sortType;
        previousSortDirectionRef.current = sortDirection;
        previousSearchTextRef.current = searchText;
        previousDateFilterRef.current = JSON.stringify(dateFilteredNotes);
      }
    }
  }, [notes, sortType, sortDirection, searchText, dateFilteredNotes, isLoading]);

  // Guardar preferencias de búsqueda en localStorage
  useEffect(() => {
    localStorage.setItem('notesShowSearch', showSearch.toString());
  }, [showSearch]);

  // Hook para cerrar menú al hacer clic fuera
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  useClickOutside(dropdownRef, closeMenu, isMenuOpen);

  const handleSort = async (type: SortType) => {
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
    
    // Ordenar notas con las nuevas preferencias
    sortAndFilterNotes(type, newDirection, searchText);
    
    // Guardar preferencias en el servidor
    try {
      await noteService.saveUserSortPreferences(type, newDirection);
      
      // También guardar en localStorage como respaldo
      localStorage.setItem('notesSortType', type);
      localStorage.setItem('notesSortDirection', newDirection);
    } catch (error) {
      console.error('Error al guardar preferencias de ordenación:', error);
    }
    
    // Cerrar menú
    setIsMenuOpen(false);
  };

  // Función para manejar el filtrado por fecha
  const handleDateFilter = (filteredNotes: Note[]) => {
    setDateFilteredNotes(filteredNotes);
    sortAndFilterNotes(sortType, sortDirection, searchText, filteredNotes);
  };

  // Función para limpiar el filtro de fecha
  const handleClearDateFilter = () => {
    setDateFilteredNotes(null);
    sortAndFilterNotes(sortType, sortDirection, searchText);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchText(text);
    sortAndFilterNotes(sortType, sortDirection, text);
  };

  const sortAndFilterNotes = (
    type: SortType, 
    direction: SortDirection, 
    search: string,
    dateFiltered: Note[] | null = null
  ) => {
    // Evitar ordenaciones innecesarias si no hay cambios
    if (
      type === previousSortTypeRef.current &&
      direction === previousSortDirectionRef.current &&
      search === previousSearchTextRef.current &&
      JSON.stringify(dateFiltered) === previousDateFilterRef.current &&
      previousNotesRef.current === JSON.stringify(notes)
    ) {
      return; // No hay cambios, salir de la función
    }
    
    // El resto de la función queda igual
    let filtered = dateFiltered ? [...dateFiltered] : [...notes];
    
    if (search && search.trim()) {
      filtered = filtered.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(search.toLowerCase());
        const contentMatch = note.content ? 
          note.content.toLowerCase().includes(search.toLowerCase()) : 
          false;
        
        return titleMatch || contentMatch;
      });
    }
    
    filtered.sort((a, b) => {
      if (type === 'pinned') {
        if (a.is_pinned && !b.is_pinned) return direction === 'asc' ? 1 : -1;
        if (!a.is_pinned && b.is_pinned) return direction === 'asc' ? -1 : 1;
      }
      
      if (type === 'title') {
        return direction === 'asc' 
          ? a.title.localeCompare(b.title) 
          : b.title.localeCompare(a.title);
      } else if (type === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
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
      case 'date': return 'Por modificación';
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
                sortAndFilterNotes(sortType, sortDirection, '', dateFilteredNotes);
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      )}
      
      {/* Añadir el título "Filtrar:" y el contenedor de los botones */}
      <div className="filter-section">
        <div className="filter-label">Filtrar:</div>
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
                Por modificación
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
          
          {/* Componente DateFilter */}
          <DateFilter 
            notes={notes}
            onDateFilter={handleDateFilter}
            onClearFilter={handleClearDateFilter}
          />
          
          <button 
            className="search-button"
            onClick={() => {
              const newShowSearch = !showSearch;
              setShowSearch(newShowSearch);
              localStorage.setItem('notesShowSearch', newShowSearch.toString());
            }}
            title={showSearch ? "Ocultar búsqueda" : "Buscar en notas"}
          >
            <i className="fas fa-search"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteSort;