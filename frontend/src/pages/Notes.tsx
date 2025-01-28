import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note } from '../types';
import '../styles/notes.css';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingNote, setEditingNote] = useState<{ [key: string]: { title: string; content: string } }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

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
      // Obtener la nota original
      const originalNote = notes.find(note => note.id === id);
      // Obtener el estado previo de la nota en edición
      const prevNoteState = prev[id] || {
        title: originalNote?.title || '',
        content: originalNote?.content || ''
      };
  
      // Crear nuevo estado para esta nota
      const updatedNoteState = {
        ...prevNoteState,
        [field]: value
      };
  
      // Retornar el nuevo estado completo
      return {
        ...prev,
        [id]: updatedNoteState
      };
    });
  };
  
  

  const handleUpdateNote = async (id: string, field: 'title' | 'content') => {
    const editedNote = editingNote[id];
    if (!editedNote) return;

    const originalNote = notes.find(note => note.id === id);
    if (!originalNote) return;

    // Verifica si el valor ha cambiado
    if (editedNote[field] === originalNote[field]) return;

    // Validación para el título
    if (field === 'title' && editedNote.title.trim() === '') {
      showFeedback('El título no puede estar vacío');
      // Restaura el valor original
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
      // Restaura el valor original en caso de error
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
    } catch (error) {
      console.error('Error deleting note:', error);
      showFeedback('Error al eliminar la nota');
    }
  };

  return (
    <div className="notes-container">
      {feedback && <div className="feedback-message">{feedback}</div>}
      
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
          onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
        />
        <button 
          onClick={handleCreateNote}
          disabled={isLoading}
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? 'Creando...' : 'Crear Nota'}
        </button>
      </div>

      <div className="notes-grid">
        {notes.map(note => (
          <div key={note.id} className="note-card">
            <input
              type="text"
              value={editingNote[note.id]?.title ?? note.title}
              onChange={e => handleNoteChange(note.id, 'title', e.target.value)}
              onBlur={() => handleUpdateNote(note.id, 'title')}
            />
            <textarea
              value={editingNote[note.id]?.content ?? note.content}
              onChange={e => handleNoteChange(note.id, 'content', e.target.value)}
              onBlur={() => handleUpdateNote(note.id, 'content')}
            />
            <button onClick={() => handleDeleteNote(note.id)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notes;
