import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note } from '../types';
import '../styles/notes.css';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  // Cargar notas solo una vez al montar el componente
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await noteService.getNotes();
        setNotes(response.notes || []);
      } catch (err) {
        const error = err as Error;
        console.error('Error loading notes:', error.message);
        // Solo navegar si es un error de autenticación
        if ((err as any)?.response?.status === 401) {
          authService.logout(); // Limpiar el token
          navigate('/login', { replace: true });
        }
      }
    };

    fetchNotes();
  }, [navigate]);

  const loadNotes = async () => {
    try {
      const response = await noteService.getNotes();
      setNotes(response.notes || []);
    } catch (err) {
      const error = err as Error;
      console.error('Error loading notes:', error.message);
      navigate('/login', { replace: true });
    }
  };

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
      
      // Asegúrate de que la estructura coincida con la respuesta del servidor
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
  

  const handleUpdateNote = async (id: string, updateFields: { title?: string; content?: string }) => {
    try {
      setIsLoading(true);
      const response = await noteService.updateNote(id, updateFields);
      
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === id ? response.note : note
        )
      );
      
      showFeedback('Nota actualizada exitosamente');
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      showFeedback('Error al actualizar la nota');
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
              value={note.title}
              onChange={e => handleUpdateNote(note.id, { title: e.target.value })}
              onBlur={e => handleUpdateNote(note.id, { title: e.target.value })}
            />
            <textarea
              value={note.content || ''}
              onChange={e => handleUpdateNote(note.id, { content: e.target.value })}
              onBlur={e => handleUpdateNote(note.id, { content: e.target.value })}
            />
            <button onClick={() => handleDeleteNote(note.id)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notes;
