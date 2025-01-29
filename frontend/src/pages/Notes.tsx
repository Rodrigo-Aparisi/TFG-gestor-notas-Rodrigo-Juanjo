import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note } from '../types';
import '../styles/notes.css';
import Masonry from 'react-masonry-css';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingNote, setEditingNote] = useState<{ [key: string]: { title: string; content: string } }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const breakpointColumns = {
    default: 4, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await noteService.getNotes();
        setNotes(response.notes || []);
      } catch (err) {
        const error = err as Error;
        console.error('Error loading notes:', error.message);
        if ((err as any)?.response?.status === 401) {
          authService.logout();
          navigate('/login', { replace: true });
        }
      }
    };

    fetchNotes();
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

  const handleFocus = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    setFocusedNoteId(id);
    document.body.style.overflow = 'hidden';
  };

  const handleBlur = () => {
    setFocusedNoteId(null);
    document.body.style.overflow = '';
    
    setTimeout(() => {
      const textareas = document.querySelectorAll('.note-card textarea');
      textareas.forEach((textarea) => {
        autoResizeTextarea(textarea as HTMLTextAreaElement);
      });
    }, 0);
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

  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    if (!element) return;
  
    // Restablece la altura antes de recalcular
    element.style.height = 'auto';
  
    // Calcula y aplica la nueva altura respetando límites
    const newHeight = Math.min(element.scrollHeight, window.innerHeight * 0.7);
    element.style.height = `${newHeight}px`;
  };  
  
  

  return (
    <div className="notes-container">
      {feedback && <div className="feedback-message">{feedback}</div>}
      
      <div 
        className={`overlay ${focusedNoteId ? 'active' : ''}`}
        onClick={handleBlur}
      />

      <div className="create-note">
        <input
          type="text"
          placeholder="Título"
          value={newNote.title}
          onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
          required
        />
        <textarea
          placeholder="Contenido de la nota..."
          value={newNote.content}
          onChange={e => {
            setNewNote(prev => ({ ...prev, content: e.target.value }));
            autoResizeTextarea(e.target);
          }}
          onInput={e => autoResizeTextarea(e.target as HTMLTextAreaElement)}
        />
        <button 
          onClick={handleCreateNote}
          disabled={isLoading}
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? 'Creando...' : 'Crear Nota'}
        </button>
      </div>

      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {notes.map(note => (
          <div 
            key={note.id}
            data-note-id={note.id}
            className={`note-card ${focusedNoteId === note.id ? 'focused' : ''}`}
            onClick={(e) => {
              if (!focusedNoteId) {
                handleFocus(note.id, e);
              }
            }}
          >
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
          </div>
        ))}
      </Masonry>
    </div>
  );
};

export default Notes;
