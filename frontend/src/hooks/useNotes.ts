import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note, UpdateNoteData } from '../types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '', images: [] as string[] });
  const [editingNote, setEditingNote] = useState<{ [key: string]: { title: string; content: string } }>({});
  const [markedNotes, setMarkedNotes] = useState<string[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sortKey, setSortKey] = useState<number>(0);
  const navigate = useNavigate();

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  }, []);

  const loadNotes = useCallback(async () => {
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
  }, [navigate]);

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      showFeedback('El título es requerido');
      return;
    }
  
    setIsLoading(true);
    try {
      // Asegúrate de que images se envíe correctamente
      const result = await noteService.createNote({
        title: newNote.title.trim(),
        content: newNote.content.trim(),
        images: newNote.images // Enviar el array de imágenes
      });
      
      if (result && result.note) {
        setNotes(prevNotes => [result.note, ...prevNotes]);
        setNewNote({ title: '', content: '', images: [] }); // Resetear también las imágenes
        
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    if (!e.target.files || !e.target.files[0]) return;
  
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
  
    try {
      showFeedback('Subiendo imagen...');
      const response = await noteService.uploadNoteImage(formData);
      
      if (response.data && response.data.data && response.data.data.imageUrl) {
        if (noteId === 'new') {
          // Para nota nueva, añadimos la imagen al array de imágenes
          setNewNote(prev => ({
            ...prev,
            images: [...(prev.images || []), response.data.data.imageUrl]
          }));
          showFeedback('Imagen añadida a la nota nueva');
        } else {
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

  const handleDeleteNote = async (id: string) => {
    try {
      await noteService.deleteNote(id);
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      setMarkedNotes(prev => prev.filter(noteId => noteId !== id));
      showFeedback('Nota eliminada');
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

  const forceReorder = () => {
    setSortKey(prev => prev + 1);
  };

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

  // Inicialización de datos
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return {
    notes,
    newNote,
    editingNote,
    markedNotes,
    filteredNotes,
    isLoading,
    feedback,
    sortKey,
    showFeedback,
    loadNotes,
    handleCreateNote,
    handleNoteChange,
    handleUpdateNote,
    handleImageUpload,
    handleDeleteImage,
    handleDeleteNote,
    handleDeleteMarkedNotes,
    handleToggleMark,
    handleTogglePin,
    setNewNote,
    setMarkedNotes,
    setFilteredNotes,
    forceReorder,
    handleFilteredNotes
  };
}
