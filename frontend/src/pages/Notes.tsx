import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios'; // Añade esta importación
import { RootState } from '../store';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note, NotePosition, Group, GroupResponse } from '../types';
import '../styles/notes.css';
import ShareNote from '../components/Notes/ShareNote';
import Masonry from 'react-masonry-css';


const Notes: React.FC = () => {
  const defaultNoteSort = useSelector((state: RootState) => state.settings.defaultNoteSort);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingNote, setEditingNote] = useState<{ [key: string]: { title: string; content: string } }>({});
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('my-notes');
  const [hasSharedNotes, setHasSharedNotes] = useState<boolean>(false);
  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [markedNotes, setMarkedNotes] = useState<string[]>([]);
  const [notePositions, setNotePositions] = useState<{[key: string]: NotePosition}>({});
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 'main',
      name: 'Todas las notas',
      color: '#f1c40f',
      isDefault: true,
      noteIds: []
    }
  ]);
  const [activeGroup, setActiveGroup] = useState<string>('main');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', color: '#f1c40f' });

  // Añade esta función después de tus declaraciones de estado
const loadNotes = async () => {
  try {
    const response = await noteService.getNotes();
    const fetchedNotes = response.notes || [];
    
    // Especifica el tipo en filter
    const markedNotes = fetchedNotes.filter((note: Note) => note.is_marked);
    
    if (markedNotes.length > 0) {
      await Promise.all(
        markedNotes.map((note: Note) => noteService.toggleMark(note.id))
      );
      
      // Especifica el tipo en map
      setNotes(fetchedNotes.map((note: Note) => ({
        ...note,
        is_marked: false
      })));
    } else {
      setNotes(fetchedNotes);
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error loading notes:', error.message);
    if ((err as any)?.response?.status === 401) {
      authService.logout();
      navigate('/login', { replace: true });
    }
  }
};


    const loadSharedNotes = useCallback(async () => {
      try {
        setIsLoading(true);
        const data = await noteService.getSharedNotes();
        setSharedNotes(data.sharedNotes);
      } catch (err) {
        console.error('Error al cargar notas compartidas:', err);
      } finally {
        setIsLoading(false);
      }
    }, []);
  

    const checkSharedNotes = useCallback(async () => {
      try {
        const data = await noteService.getSharedNotes();
        setHasSharedNotes(data.sharedNotes && data.sharedNotes.length > 0);
      } catch (err) {
        console.error('Error al verificar notas compartidas:', err);
      }
    }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'my-notes') {
      loadNotes();
    } else if (tabId === 'shared-notes') {
      loadSharedNotes();
    }
  };

  const breakpointColumns = {
    default: 4, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
};


  useEffect(() => {
    const fetchNotesAndUnmark = async () => {
      try {
        const response = await noteService.getNotes();
        const fetchedNotes = response.notes || [];
        
        // Especifica el tipo en filter
        const markedNotes = fetchedNotes.filter((note: Note) => note.is_marked);
        
        if (markedNotes.length > 0) {
          await Promise.all(
            markedNotes.map((note: Note) => noteService.toggleMark(note.id))
          );
          
          // Especifica el tipo en map
          setNotes(fetchedNotes.map((note: Note) => ({
            ...note,
            is_marked: false
          })));
        } else {
          setNotes(fetchedNotes);
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error loading notes:', error.message);
        if ((err as any)?.response?.status === 401) {
          authService.logout();
          navigate('/login', { replace: true });
        }
      }
    };

    fetchNotesAndUnmark();
  }, [navigate]);

  useEffect(() => {
    loadNotes();
    checkSharedNotes();
  }, []);

  useEffect(() => {
    const textareas = document.querySelectorAll('.note-card textarea');
    textareas.forEach((textarea) => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [notes, breakpointColumns, focusedNoteId]);

  useEffect(() => {
    const handleResize = () => {
      const textareas = document.querySelectorAll('.note-card textarea');
      textareas.forEach((textarea) => {
        autoResizeTextarea(textarea as HTMLTextAreaElement);
      });
    };
  
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  useEffect(() => {
    if (focusedNoteId) {
      const focusedTextarea = document.querySelector('.note-card.focused textarea');
      if (focusedTextarea) {
        autoResizeTextarea(focusedTextarea as HTMLTextAreaElement);
      }
    }
  }, [focusedNoteId]);

  useEffect(() => {
    if (!focusedNoteId) {
      setNotePositions({});
    }
  }, [focusedNoteId]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        console.log('Fetching groups...');
        const response = await noteService.getGroups();
        console.log('Groups response:', response);
        
        if (response && response.groups) {
          const formattedGroups: Group[] = response.groups.map((group: GroupResponse) => ({
            id: group.id.toString(),
            name: group.name,
            color: group.color,
            noteIds: Array.isArray(group.note_ids) 
              ? group.note_ids.filter((id): id is string => id !== null)
              : [],
            isDefault: false
          }));
          
          setGroups(prev => {
            const mainGroup = prev.find(g => g.isDefault);
            return mainGroup ? [mainGroup, ...formattedGroups] : formattedGroups;
          });
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
  
    fetchGroups();
  }, []);
  
  
  // Actualiza el efecto que filtra las notas
  useEffect(() => {
    if (activeGroup === 'main') {
      setFilteredNotes(notes);
    } else {
      const currentGroup = groups.find(g => g.id === activeGroup);
      if (currentGroup && Array.isArray(currentGroup.noteIds)) {
        const groupNotes = notes.filter(note => 
          currentGroup.noteIds.includes(note.id.toString())
        );
        setFilteredNotes(groupNotes);
      } else {
        setFilteredNotes([]);
      }
    }
  }, [activeGroup, notes, groups]);



  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      showFeedback('El título es requerido');
      return;
    }

    setIsLoading(true);
    try {
      const result = await noteService.createNote({
        title: newNote.title.trim(),
        content: newNote.content.trim()
      });
      
      if (result && result.note) {
        setNotes(prevNotes => [result.note, ...prevNotes]);
        setNewNote({ title: '', content: '' });
        
        const titleInput = document.querySelector('.create-note input[type="text"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = '';
        }

        showFeedback('Nota creada exitosamente');
      }
    } catch (error: any) {
      console.error('Error creating note:', error);
      showFeedback(error.response?.data?.error || 'Error al crear la nota');
    } finally {
      setIsLoading(false);
    }
  };

  const sortNotes = (notesToSort: Note[]) => {
    return [...notesToSort].sort((a, b) => {
      // Primero ordenar por pin
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      // Luego por la fecha de creación (o el criterio que prefieras)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const handleNoteChange = (id: string, field: 'title' | 'content', value: string) => {
    setEditingNote(prev => {
      const originalNote = notes.find(note => note.id === id);
      const prevNoteState = prev[id] || {
        title: originalNote?.title || '',
        content: originalNote?.content || ''
      };

      return {
        ...prev,
        [id]: {
          ...prevNoteState,
          [field]: value
        }
      };
    });

    if (field === 'content') {
      const textarea = document.querySelector(`[data-note-id="${id}"] textarea`);
      if (textarea) {
        autoResizeTextarea(textarea as HTMLTextAreaElement);
      }
    }
  };

  const handleUpdateNote = async (id: string, field: 'title' | 'content') => {
    const editedNote = editingNote[id];
    if (!editedNote) return;

    const originalNote = notes.find(note => note.id === id);
    if (!originalNote) return;

    if (editedNote[field] === originalNote[field]) return;

    if (field === 'title' && editedNote.title.trim() === '') {
      showFeedback('El título no puede estar vacío');
      setEditingNote(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          title: originalNote.title
        }
      }));
      return;
    }

    try {
      setIsLoading(true);
      const updateData = { [field]: editedNote[field] };
      const response = await noteService.updateNote(id, updateData);
      
      if (response && response.note) {
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === id ? response.note : note
          )
        );
        showFeedback('Nota actualizada');
      }
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      showFeedback('Error al actualizar la nota');
      setEditingNote(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: originalNote[field]
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await noteService.deleteNote(id);
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      setMarkedNotes(prev => prev.filter(noteId => noteId !== id));
      showFeedback('Nota eliminada');
      if (focusedNoteId === id) {
        setFocusedNoteId(null);
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showFeedback('Error al eliminar la nota');
    }
  };

  const handleDeleteMarkedNotes = async () => {
    if (!markedNotes.length) return;
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${markedNotes.length} nota(s)?`)) {
      try {
        await Promise.all(markedNotes.map(id => noteService.deleteNote(id)));
        setNotes(prevNotes => prevNotes.filter(note => !markedNotes.includes(note.id)));
        setMarkedNotes([]);
        showFeedback('Notas eliminadas correctamente');
      } catch (error) {
        console.error('Error al eliminar notas:', error);
        showFeedback('Error al eliminar las notas');
      }
    }
  };

  
  const getNoteGroup = (noteId: string) => {
    return groups.find(group => 
      !group.isDefault && group.noteIds.includes(noteId)
    );
  };
  

  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name.trim()) {
        showFeedback('El nombre del grupo es requerido');
        return;
      }
  
      const newGroupData = {
        name: newGroup.name.trim(),
        color: newGroup.color || '#f1c40f',
        noteIds: markedNotes
      };
  
      const response = await noteService.createGroup(newGroupData);
      
      if (response && response.group) {
        const formattedGroup: Group = {
          id: response.group.id.toString(),
          name: response.group.name,
          color: response.group.color,
          noteIds: Array.isArray(response.group.note_ids) 
            ? response.group.note_ids.filter((id): id is string => id !== null)
            : [],
          isDefault: false
        };
  
        setGroups(prev => [...prev, formattedGroup]);
        setMarkedNotes([]);
        setShowGroupModal(false);
        setNewGroup({ name: '', color: '#f1c40f' });
        showFeedback('Grupo creado exitosamente');
      }
    } catch (error) {
      console.error('Error al crear grupo:', error);
      showFeedback('Error al crear el grupo');
    }
  };
  
  

  
  const handleDeleteGroup = async (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      try {
        await noteService.deleteGroup(groupId);
        
        setGroups(prev => prev.filter(group => group.id !== groupId));
        if (activeGroup === groupId) {
          setActiveGroup('main');
        }
        showFeedback('Grupo eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar grupo:', error);
        showFeedback('Error al eliminar el grupo');
      }
    }
  };
  


  const handleFocus = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    const noteElement = event.currentTarget;
    const rect = noteElement.getBoundingClientRect();
    const columnPosition = getColumnPosition(noteElement);
    
    // Establecer las propiedades CSS iniciales
    noteElement.style.setProperty('--original-width', `${rect.width}px`);
    noteElement.style.setProperty('--original-height', `${rect.height}px`);
    noteElement.style.setProperty('--original-top', `${rect.top}px`);
    noteElement.style.setProperty('--original-left', `${rect.left}px`);
    
    setNotePositions(prev => ({
      ...prev,
      [id]: { rect, columnPosition }
    }));
    
    noteElement.classList.add('focusing');
    noteElement.setAttribute('data-column-position', columnPosition);
    
    // Usar requestAnimationFrame para asegurar que las propiedades CSS se apliquen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        noteElement.classList.add('focused');
      });
    });
    
    setFocusedNoteId(id);
    document.body.style.overflow = 'hidden';
  };
  

  const handleBlur = () => {
    const focusedNote = document.querySelector('.note-card.focused');
    if (focusedNote) {
      const id = focusedNoteId as string;
      const position = notePositions[id];
      
      if (position) {
        const element = focusedNote as HTMLElement;
        
        // Restaurar las propiedades originales
        element.style.setProperty('--original-width', `${position.rect.width}px`);
        element.style.setProperty('--original-height', `${position.rect.height}px`);
        element.style.setProperty('--original-top', `${position.rect.top}px`);
        element.style.setProperty('--original-left', `${position.rect.left}px`);
        
        element.classList.remove('focused');
        
        setTimeout(() => {
          element.classList.remove('focusing');
          element.removeAttribute('data-column-position');
          element.style.removeProperty('--original-width');
          element.style.removeProperty('--original-height');
          element.style.removeProperty('--original-top');
          element.style.removeProperty('--original-left');
        }, 300);
      }
    }
    
    // Resetear el sharingNoteId cuando se minimiza la nota
    setSharingNoteId(null);
    
    setFocusedNoteId(null);
    document.body.style.overflow = '';
  };
  
  

  const handleFocusIndicatorClick = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (focusedNoteId === id) {
      handleBlur();
    } else {
      setFocusedNoteId(id);
      document.body.style.overflow = 'hidden';
    }
  };

  const handleToggleMark = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await noteService.toggleMark(id);
      if (response && response.note) {
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === id ? response.note : note
          )
        );
        
        setMarkedNotes(prev => {
          if (response.note.is_marked) {
            return [...prev, id];
          } else {
            return prev.filter(noteId => noteId !== id);
          }
        });
      }
    } catch (error) {
      console.error('Error al marcar/desmarcar nota:', error);
      showFeedback('Error al actualizar la nota');
    }
  };
  
  const handleTogglePin = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await noteService.togglePin(id);
      if (response && response.note) {
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === id ? response.note : note
          )
        );
        showFeedback(response.note.is_pinned ? 'Nota fijada' : 'Nota desfijada');
      }
    } catch (error) {
      console.error('Error al fijar/desfijar nota:', error);
      showFeedback('Error al actualizar la nota');
    }
  };

  const getColumnPosition = (element: HTMLElement): 'left' | 'right' => {
    const columnIndex = Array.from(element.closest('.masonry-grid')?.children || [])
      .findIndex(col => col.contains(element));
    const totalColumns = breakpointColumns.default;
    
    // Si está en las dos primeras columnas, considerarlo 'left'
    return columnIndex < totalColumns / 2 ? 'left' : 'right';
  };
  

  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    if (!element) return;
    
    // Guarda la posición actual del scroll
    const scrollPos = element.scrollTop;
    
    // Resetea la altura para obtener la altura real del contenido
    element.style.height = 'auto';
    
    const isCreateNote = element.closest('.create-note');
    const parentNote = element.closest('.note-card');
    const isFocused = parentNote?.classList.contains('focused');
    
    if (isCreateNote) {
      // Para el textarea de crear nota
      element.style.height = 'auto';
      const newHeight = Math.min(element.scrollHeight, 200);
      element.style.height = `${newHeight}px`;
    } else if (isFocused) {
      // Para notas enfocadas
      element.style.height = 'auto';
      const maxHeight = Math.min(window.innerHeight * 0.6, element.scrollHeight);
      element.style.height = `${maxHeight}px`;
    } else {
      // Para notas normales
      element.style.height = 'auto';
      const newHeight = Math.min(element.scrollHeight, 500);
      element.style.height = `${newHeight}px`;
    }
    
    // Restaura la posición del scroll
    element.scrollTop = scrollPos;
  };

  const handleGroupSelect = (groupId: string) => {
    console.log('Selecting group:', groupId);
    setActiveGroup(groupId);
  };  

  const renderGroups = () => (
    <div className="group-list">
      {groups.map((group) => (
        <div 
          key={`group-${group.id}`}
          className={`group-item ${activeGroup === group.id ? 'active' : ''}`}
          onClick={() => handleGroupSelect(group.id)}
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
                e.stopPropagation();
                handleDeleteGroup(group.id, e);
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      ))}
    </div>
  );
  
  
  
  

  return (
    <div className="notes-layout">
      {/* Sidebar */}
      <div className="notes-sidebar">
        {renderGroups()}
      </div>
  
      {/* Contenido principal */}
      <div className="notes-main">
      <div className="tabs-container">
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'my-notes' ? 'active' : ''}`} 
            onClick={() => handleTabChange('my-notes')}
          >
            Mis Notas
          </div>
          <div 
            className={`tab ${activeTab === 'shared-notes' ? 'active' : ''}`} 
            onClick={() => handleTabChange('shared-notes')}
          >
            Notas Compartidas
            {hasSharedNotes && <span className="notification-dot"></span>}
          </div>
        </div>
      </div>
        {feedback && <div className="feedback-message">{feedback}</div>}
        
        {/* Añadir encabezado del grupo activo */}
        {activeGroup && (
          <div className="active-group-header" style={{
            color: groups.find(g => g.id === activeGroup)?.color || '#f1c40f'
          }}>
            {groups.find(g => g.id === activeGroup)?.name || 'Todas las notas'}
          </div>
        )}
        
        <div 
          className={`overlay ${focusedNoteId ? 'active' : ''}`}
          onClick={handleBlur}
        />

        <div 
          className={`overlay ${focusedNoteId ? 'active' : ''}`}
          onClick={handleBlur}
        />
  
        {/* Menú de acciones en masa */}
        <div className={`bulk-actions-menu ${markedNotes.length > 0 ? 'visible' : ''}`}>
          <div className="left-section">
            <span>{markedNotes.length} {markedNotes.length === 1 ? 'nota seleccionada' : 'notas seleccionadas'}</span>
          </div>
          <div className="right-section">
            <button 
              className="create-group-button"
              onClick={() => setShowGroupModal(true)}
              disabled={markedNotes.length === 0}
            >
              <i className="fas fa-layer-group"></i>
              Crear grupo
            </button>
            <button 
              className="bulk-delete-button"
              onClick={handleDeleteMarkedNotes}
              title="Eliminar notas seleccionadas"
            >
              <i className="fas fa-trash"></i>
              Eliminar seleccionadas
            </button>
          </div>
        </div>
  
        {/* Crear nota */}
        {activeTab === 'my-notes' && (
          <div className="create-note">
            <input
              type="text"
              placeholder="Añade una nota..."
              value={newNote.title}
              onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              onClick={() => {
                if (!isExpanded) {
                  setIsExpanded(true);
                }
              }}
            />
            {isExpanded && (
              <>
                <textarea
                  placeholder="Contenido de la nota..."
                  value={newNote.content}
                  onChange={e => {
                    setNewNote(prev => ({ ...prev, content: e.target.value }));
                    autoResizeTextarea(e.target as HTMLTextAreaElement);
                  }}
                  onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                />
                <div className="button-container">
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setIsExpanded(false);
                      setNewNote({ title: '', content: '' });
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="create-button"
                    onClick={() => {
                      handleCreateNote();
                      setIsExpanded(false);
                    }}
                    disabled={isLoading}
                  >
                    Crear Nota
                  </button>
                </div>
              </>
            )}
          </div>
        )}
  
        {/* Grid de notas */}
        <Masonry
          breakpointCols={breakpointColumns}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
        >
          {activeTab === 'my-notes' ? (
            // Tus notas existentes
            sortNotes(filteredNotes).map(note => {
              // Obtener el color del grupo activo
              const activeGroupColor = groups.find(g => g.id === activeGroup)?.color || '#f1c40f';
              
              return (
                <div 
                  key={note.id}
                  className={`note-card ${focusedNoteId === note.id ? 'focused' : ''}`}
                  onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
                  style={{
                    borderColor: activeGroup !== 'main' ? activeGroupColor : '#ccc',
                    borderWidth: activeGroup !== 'main' ? '2px' : '1px'
                  }}
                >
                  <div className="note-actions">
                    <button 
                      className={`action-button ${note.is_marked ? 'marked' : ''}`}
                      onClick={(e) => handleToggleMark(note.id, e)}
                      title={note.is_marked ? 'Desmarcar nota' : 'Marcar nota'}
                    >
                      <i className="fas fa-check-circle"></i>
                    </button>
                    <button 
                      className={`action-button ${note.is_pinned ? 'pinned' : ''}`}
                      onClick={(e) => handleTogglePin(note.id, e)}
                      title={note.is_pinned ? 'Desfijar nota' : 'Fijar nota'}
                    >
                      <i className="fas fa-thumbtack"></i>
                    </button>
                    <button 
                      className="action-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!sharingNoteId || sharingNoteId !== note.id) {
                          setSharingNoteId(note.id);
                        } else {
                          setSharingNoteId(null);
                        }
                      }}
                      title="Compartir nota"
                    >
                      <i className="fas fa-share-alt"></i>
                    </button>
                  </div>
                  <div 
                    className="focus-indicator"
                    onClick={(e) => handleFocusIndicatorClick(e, note.id)}
                  />
                  <div className="note-content">
                    <input
                      type="text"
                      value={editingNote[note.id]?.title ?? note.title}
                      onChange={e => handleNoteChange(note.id, 'title', e.target.value)}
                      onBlur={() => handleUpdateNote(note.id, 'title')}
                      onClick={e => e.stopPropagation()}
                    />
                    <textarea
                      value={editingNote[note.id]?.content ?? note.content}
                      onChange={(e) => {
                        handleNoteChange(note.id, 'content', e.target.value);
                        autoResizeTextarea(e.target as HTMLTextAreaElement);
                      }}
                      onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                      onBlur={(e) => {
                        handleUpdateNote(note.id, 'content');
                        autoResizeTextarea(e.target as HTMLTextAreaElement);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    className="delete-button"
                  >
                    Eliminar
                  </button>
                  {sharingNoteId === note.id && (
                    <div className="share-note-section">
                      <ShareNote noteId={note.id} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Notas compartidas
            sharedNotes.length > 0 ? (
              sharedNotes.map(note => (
                <div 
                  key={note.id}
                  className={`note-card ${focusedNoteId === note.id ? 'focused' : ''}`}
                  onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
                  style={{
                    backgroundColor: note.color || undefined,
                    borderColor: '#ccc',
                    borderWidth: '1px'
                  }}
                >
                  <div 
                    className="focus-indicator"
                    onClick={(e) => handleFocusIndicatorClick(e, note.id)}
                  />
                  <div className="note-content">
                    <input
                      type="text"
                      value={note.title || ''}
                      readOnly
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="shared-by">
                      Compartida por: {note.shared_by || 'Desconocido'}
                    </div>
                    <textarea
                      value={note.content || ''}
                      readOnly
                      onClick={(e) => e.stopPropagation()}
                      ref={(textarea) => {
                        if (textarea) {
                          autoResizeTextarea(textarea);
                        }
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-notes">No tienes notas compartidas</div>
            )
          )}
        </Masonry>


  
        {/* Modal de creación de grupo */}
        {showGroupModal && (
          <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Crear nuevo grupo</h2>
              <div className="form-group">
                <label>Nombre del grupo</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ingrese el nombre del grupo"
                />
              </div>
              <div className="form-group">
                <label>Color del grupo</label>
                <input
                  type="color"
                  value={newGroup.color}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowGroupModal(false)}>Cancelar</button>
                <button onClick={handleCreateGroup}>Crear grupo</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  
};

export default Notes;
