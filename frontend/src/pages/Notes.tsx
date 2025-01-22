// pages/Notes.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { apiService } from '../services/api.ts';
import { setNotes } from '../store/slices/notesSlice';
import { Note } from '../types';

const NotesPage: React.FC = () => {
  const dispatch = useDispatch();
  const notes = useSelector((state: RootState) => state.notes.list);

  // Cargar notas al montar el componente
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await apiService.getNotes();
        dispatch(setNotes(response.data));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    };

    loadNotes();
  }, [dispatch]);

  return (
    <div>
      <h1>Mis Notas</h1>
      <div className="notes-grid">
        {notes.map((note: Note) => (
          <div key={note.id} className="note-card">
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <small>
              Última actualización: {new Date(note.updatedAt).toLocaleDateString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesPage;
