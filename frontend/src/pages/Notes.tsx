import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { Note } from '../types';
import { authService } from '../services/auth';
import '../styles/notes.css';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await noteService.getNotes();
      setNotes(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout();
        navigate('/login', { replace: true });
      }
      console.error('Error loading notes:', error);
    }
  };

  const handleCreateNote = async () => {
    try {
      const response = await noteService.createNote({
        title: newNote.title,
        content: newNote.content
      });

      setNotes(prevNotes => [response.data.data, ...prevNotes]);
      setNewNote({ title: '', content: '' });
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleUpdateNote = async (id: string, updateFields: { title?: string; content?: string }) => {
    try {
      const response = await noteService.updateNote(id, updateFields);
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === id ? response.data.data : note
        )
      );
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await noteService.deleteNote(id);
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="notes-container">
      <div className="create-note">
        <input
          type="text"
          placeholder="Título"
          value={newNote.title}
          onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
        />
        <textarea
          placeholder="Crear una nota..."
          value={newNote.content}
          onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
        />
        <button onClick={handleCreateNote}>Crear</button>
      </div>

      <div className="notes-grid">
        {notes.map(note => (
          <div key={note.id} className="note-card">
            <input
              type="text"
              value={note.title}
              onChange={e => handleUpdateNote(note.id, { title: e.target.value })}
            />
            <textarea
              value={note.content}
              onChange={e => handleUpdateNote(note.id, { content: e.target.value })}
            />
            <button onClick={() => handleDeleteNote(note.id)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notes;
