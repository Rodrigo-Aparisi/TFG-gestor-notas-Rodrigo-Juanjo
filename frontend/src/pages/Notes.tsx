import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note, NotePosition, Group, GroupResponse, UpdateNoteData} from '../types';
import '../styles/notes.css';
import Masonry from 'react-masonry-css';
import NoteImage from '../components/Notes/NoteImage';
import NoteSort from '../components/Notes/NoteSort';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingNote, setEditingNote] = useState<{ [key: string]: { title: string; content: string } }>({});
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
  const [sortKey, setSortKey] = useState<number>(0);
  

  const breakpointColumns = {
    default: 5, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
};

  type ListType = 'bullet' | 'number';


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

        forceReorder();

        showFeedback('Nota creada exitosamente');
      }
    } catch (error: any) {
      console.error('Error creating note:', error);
      showFeedback(error.response?.data?.error || 'Error al crear la nota');
    } finally {
      setIsLoading(false);
    }
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

        forceReorder();
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

  const processContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Detectar imágenes
      const imageMatch = line.match(/!\$\$(.*?)\$\$\$(.*?)\$/);
      if (imageMatch) {
        return (
          <div key={index} className="note-image-container">
            <img 
              src={imageMatch[2]} 
              alt={imageMatch[1] || 'Imagen de nota'} 
              className="note-image"
              loading="lazy"
              onError={(e) => {
                console.error('Error loading image:', e);
                e.currentTarget.src = '/placeholder-image.png';
              }}
            />
          </div>
        );
      }
  
      // Detectar enlaces
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (line.match(urlRegex)) {
        return (
          <div key={index} className="note-link">
            {line.split(urlRegex).map((part, i) => 
              part.match(urlRegex) ? 
                <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : 
                part
            )}
          </div>
        );
      }
  
      // Detectar listas con viñetas
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <div key={index} className="list-item bullet">
            <span className="bullet-point">•</span>
            <span className="list-content">{line.trim().substring(1).trim()}</span>
          </div>
        );
      }
  
      // Detectar listas numeradas
      const orderedMatch = line.match(/^\d+\./);
      if (orderedMatch) {
        return (
          <div key={index} className="list-item numbered">
            <span className="number">{orderedMatch[0]}</span>
            <span className="list-content">{line.substring(orderedMatch[0].length).trim()}</span>
          </div>
        );
      }
  
      // Texto normal
      return line.trim() ? (
        <div key={index} className="text-content">
          {line}
        </div>
      ) : <br key={index} />;
    });
  };
  

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    if (!e.target.files || !e.target.files[0]) return;
  
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
  
    try {
      showFeedback('Subiendo imagen...');
      const response = await noteService.uploadNoteImage(formData);
      
      if (response.data && response.data.data && response.data.data.imageUrl) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          const updatedImages = [...(note.images || []), response.data.data.imageUrl];
          const updateData: UpdateNoteData = {
            images: updatedImages
          };
  
          await noteService.updateNote(noteId, updateData);
          
          const updatedNote = {
            ...note,
            images: updatedImages
          };
  
          setNotes(prevNotes => 
            prevNotes.map(n => 
              n.id === noteId ? updatedNote : n
            )
          );
          
          showFeedback('Imagen subida correctamente');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showFeedback('Error al subir la imagen');
    }
  };
  
  const handleDeleteImage = async (noteId: string, imageIndex: number) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
  
    const updatedImages = note.images.filter((_, index) => index !== imageIndex);
    const updateData: UpdateNoteData = {
      images: updatedImages
    };
  
    try {
      await noteService.updateNote(noteId, updateData);
      
      const updatedNote = {
        ...note,
        images: updatedImages
      };
  
      setNotes(prevNotes =>
        prevNotes.map(n =>
          n.id === noteId ? updatedNote : n
        )
      );
      showFeedback('Imagen eliminada correctamente');
    } catch (error) {
      console.error('Error deleting image:', error);
      showFeedback('Error al eliminar la imagen');
    }
  };
  
  
  
  
  

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote = false) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;
      const lines = content.split('\n');
      let currentLine = '';
      let charCount = 0;
      let indentLevel = 0;
      
      // Encontrar la línea actual y su nivel de indentación
      for (const line of lines) {
        if (charCount + line.length + 1 >= selectionStart) {
          currentLine = line;
          indentLevel = (line.match(/^\s*/) || [''])[0].length;
          break;
        }
        charCount += line.length + 1;
      }
  
      // Detectar si estamos en una lista
      const bulletMatch = currentLine.match(/^(\s*)([•\-*]|\d+\.)\s*/);
      if (bulletMatch) {
        e.preventDefault();
        
        const [, indent, bullet] = bulletMatch;
        
        // Si la línea está vacía (excepto por el marcador), terminar la lista
        if (currentLine.trim() === bullet.trim()) {
          const newContent = content.slice(0, selectionStart - bulletMatch[0].length) + 
                           '\n' + content.slice(selectionStart);
          
          if (isNewNote) {
            setNewNote(prev => ({ ...prev, content: newContent }));
          } else {
            handleNoteChange(noteId, 'content', newContent);
          }
          return;
        }
  
        // Continuar la lista con la misma indentación
        const newBullet = bullet.match(/\d+\./) 
          ? `${parseInt(bullet) + 1}.` 
          : '•';
        
        const newContent = content.slice(0, selectionStart) + 
                          '\n' + indent + newBullet + ' ' + 
                          content.slice(selectionStart);
        
        if (isNewNote) {
          setNewNote(prev => ({ ...prev, content: newContent }));
        } else {
          handleNoteChange(noteId, 'content', newContent);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;
      
      // Insertar tabulación
      const newContent = content.slice(0, selectionStart) + 
                        '    ' + // 4 espacios para la tabulación
                        content.slice(selectionStart);
      
      if (isNewNote) {
        setNewNote(prev => ({ ...prev, content: newContent }));
      } else {
        handleNoteChange(noteId, 'content', newContent);
      }
      
      // Mover el cursor después de la tabulación
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
      });
    }
  };
  
  

  const insertList = (noteId: string, type: ListType, isNewNote = false) => {
    let currentContent;
    if (isNewNote) {
      currentContent = newNote.content;
    } else {
      // Usar el contenido del estado de edición si existe, si no usar el contenido original de la nota
      const note = notes.find(n => n.id === noteId);
      currentContent = editingNote[noteId]?.content ?? note?.content ?? '';
    }
  
    const selectionStart = document.activeElement instanceof HTMLTextAreaElement ? 
      document.activeElement.selectionStart : currentContent.length;
    
    let insertText = '\n';
    if (type === 'bullet') {
      insertText += '• ';
    } else {
      insertText += '1. ';
    }
  
    const newContent = currentContent.slice(0, selectionStart) + 
                      insertText + 
                      currentContent.slice(selectionStart);
  
    if (isNewNote) {
      setNewNote(prev => ({ ...prev, content: newContent }));
    } else {
      handleNoteChange(noteId, 'content', newContent);
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
        
        forceReorder();

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
        
        forceReorder();
        
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
  
  
  const handleFilteredNotes = (filtered: Note[]) => {
    // Siempre aplicamos el ordenamiento por pins primero
    const orderedFiltered = [...filtered].sort((a, b) => {
      // Primero ordenar por pin
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0; // Mantener el orden que viene del componente NoteSort
    });
    
    setFilteredNotes(orderedFiltered);
  };

  // Función para forzar reordenación
  const forceReorder = () => {
    setSortKey(prev => prev + 1); // Incrementar el sortKey forzará una reordenación
  };
  

  return (
    <div className="notes-layout">
      {/* Sidebar */}
      <div className="notes-sidebar">
        {renderGroups()}
      </div>
  
      {/* Contenido principal */}
      <div className="notes-main">
        {feedback && <div className="feedback-message">{feedback}</div>}
        
        {/* Añadir encabezado del grupo activo */}
        {activeGroup && (
          <div className="active-group-header" style={{
            color: groups.find(g => g.id === activeGroup)?.color || '#f1c40f'
          }}>
            {groups.find(g => g.id === activeGroup)?.name || 'Todas las notas'}
          </div>
        )}
  
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
  
        {/* Crear nota y herramientas de ordenación */}
        <div className="note-tools-container">
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
                onKeyDown={e => handleKeyDown(e, '', true)}
                onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
              />
              <div className="button-container">
                <div className="left-actions">
                  <button 
                    className="list-button"
                    onClick={() => insertList('', 'bullet', true)}
                    title="Insertar lista con viñetas"
                  >
                    <i className="fas fa-list-ul"></i>
                  </button>
                  <button 
                    className="list-button"
                    onClick={() => insertList('', 'number', true)}
                    title="Insertar lista numerada"
                  >
                    <i className="fas fa-list-ol"></i>
                  </button>
                </div>
                <div className="right-actions">
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
              </div>
            </>
            )}
          </div>
          
          <NoteSort 
            key={`note-sort-${sortKey}`}
            notes={activeGroup === 'main' ? notes : notes.filter(note => {
              const currentGroup = groups.find(g => g.id === activeGroup);
              return currentGroup && Array.isArray(currentGroup.noteIds) && 
                currentGroup.noteIds.includes(note.id.toString());
            })}
            onNotesFiltered={handleFilteredNotes}
          />
        </div>

  
        {/* Grid de notas */}
        <Masonry
          breakpointCols={breakpointColumns}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
        >
          
          {filteredNotes.map(note => {
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
                  
                  {/* Sección de imágenes */}
                  {note.images && note.images.length > 0 && (
                    <div className="note-images">
                      {note.images.map((imageUrl, index) => (
                        <NoteImage
                          key={index}
                          imageUrl={imageUrl}
                          index={index}
                          onDelete={() => handleDeleteImage(note.id, index)}
                        />
                      ))}
                    </div>
                  )}

                  <textarea
                    value={editingNote[note.id]?.content ?? note.content}
                    onChange={(e) => {
                      handleNoteChange(note.id, 'content', e.target.value);
                      autoResizeTextarea(e.target as HTMLTextAreaElement);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, note.id)}
                    onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                    onBlur={(e) => {
                      handleUpdateNote(note.id, 'content');
                      autoResizeTextarea(e.target as HTMLTextAreaElement);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>


                <div className="note-actions-bottom">
                  <div className="list-buttons">
                    <button 
                      className="list-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        insertList(note.id, 'bullet');
                      }}
                      title="Insertar lista con viñetas"
                    >
                      <i className="fas fa-list-ul"></i>
                    </button>
                    <button 
                      className="list-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        insertList(note.id, 'number');
                      }}
                      title="Insertar lista numerada"
                    >
                      <i className="fas fa-list-ol"></i>
                    </button>
                    <button 
                      className="list-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById(`image-input-${note.id}`)?.click();
                      }}
                      title="Insertar imagen"
                    >
                      <i className="fas fa-image"></i>
                    </button>
                    <input
                      id={`image-input-${note.id}`}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageUpload(e, note.id)}
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
                </div>
              </div>
            );
          })}
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
