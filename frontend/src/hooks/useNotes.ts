import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note, UpdateNoteData } from '../types';
import { exportAsPDF as exportAsPDFHelper } from '../utils/exportHelpers';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashNotes, setTrashNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '', images: [] as string[] });
  const [editingNote, setEditingNote] = useState<{ [key: string]: { title: string; content: string } }>({});
  const [markedNotes, setMarkedNotes] = useState<string[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<number>(0);
  const navigate = useNavigate();

  const loadNotes = useCallback(async () => {
    try {
      const response = await noteService.getNotes();
      const fetchedNotes = response.notes || [];

      setNotes(fetchedNotes);
      setMarkedNotes(
        fetchedNotes
          .filter((note: Note) => note.is_marked)
          .map((note: Note) => note.id)
      );
    } catch (err) {
      const error = err as Error;
      console.error('Error loading notes:', error.message);
      if ((err as any)?.response?.status === 401) {
        authService.logout();
        navigate('/login', { replace: true });
      }
    }
  }, [navigate]);

  const loadTrashNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await noteService.getTrashNotes();
      setTrashNotes(response.notes || []);
    } catch (err) {
      const error = err as Error;
      console.error('Error loading trash notes:', error.message);
      if ((err as any)?.response?.status === 401) {
        authService.logout();
        navigate('/login', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      toast.error('El título es requerido');
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
        toast.success('Nota creada exitosamente');
      }
    } catch (error: unknown) {
      console.error('Error creating note:', error);
      const apiError = error as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || 'Error al crear la nota');
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
      toast.error('El título no puede estar vacío');
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
        toast.success('Nota actualizada');
      }
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      toast.error('Error al actualizar la nota');
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
      toast('Subiendo imagen...');
      const response = await noteService.uploadNoteImage(formData);

      if (response.data && response.data.data && response.data.data.imageUrl) {
        if (noteId === 'new') {
          // Para nota nueva, añadimos la imagen al array de imágenes
          setNewNote(prev => ({
            ...prev,
            images: [...(prev.images || []), response.data.data.imageUrl]
          }));
          toast.success('Imagen añadida a la nota nueva');
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

            toast.success('Imagen subida correctamente');
          }
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
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
      toast.success('Imagen eliminada correctamente');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Error al eliminar la imagen');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await noteService.deleteNote(id);
      
      if (window.location.pathname === '/trash') {
        setTrashNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        toast.success('Nota eliminada permanentemente');
      } else {
        // Actualizamos la lista de notas
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));

        // Actualizamos la lista de notas marcadas
        setMarkedNotes(prev => prev.filter(noteId => noteId !== id));

        // También actualizamos filteredNotes para que se actualice la UI inmediatamente
        setFilteredNotes(prevFiltered => prevFiltered.filter(note => note.id !== id));

        toast.success('Nota movida a la papelera');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Error al procesar la nota');
    }
  };

  const handleRestoreNote = async (id: string) => {
    try {
      const response = await noteService.restoreNote(id);
      if (response && response.note) {
        setTrashNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        toast.success('Nota restaurada exitosamente');
      }
    } catch (error) {
      console.error('Error al restaurar nota:', error);
      toast.error('Error al restaurar la nota');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('¿Estás seguro de vaciar la papelera? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await noteService.emptyTrash();
      setTrashNotes([]);
      toast.success('Papelera vaciada exitosamente');
    } catch (error) {
      console.error('Error al vaciar papelera:', error);
      toast.error('Error al vaciar la papelera');
    }
  };

  const handleDeleteMarkedNotes = async () => {
    if (!markedNotes.length) return;
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${markedNotes.length} nota(s)?`)) {
      try {
        if (window.location.pathname === '/trash') {
          await Promise.all(markedNotes.map(id => noteService.deleteNote(id)));
          setTrashNotes(prevNotes => prevNotes.filter(note => !markedNotes.includes(note.id)));
          toast.success('Notas eliminadas permanentemente');
        } else {
          await Promise.all(markedNotes.map(id => noteService.deleteNote(id)));
          setNotes(prevNotes => prevNotes.filter(note => !markedNotes.includes(note.id)));
          toast.success('Notas movidas a la papelera');
        }
        setMarkedNotes([]);
      } catch (error) {
        console.error('Error al procesar notas:', error);
        toast.error('Error al procesar las notas');
      }
    }
  };

  // En el hook useNotes.ts
  const handleToggleMark = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      // Actualizar solo el estado local para mejor UX
      setMarkedNotes(prev => {
        const isCurrentlyMarked = prev.includes(id);
        return isCurrentlyMarked 
          ? prev.filter(noteId => noteId !== id) 
          : [...prev, id];
      });
      
      // Llamada a la API sin actualizar el estado de las notas
      await noteService.toggleMark(id);
      
    } catch (error) {
      console.error('Error al marcar/desmarcar nota:', error);
      // Restaurar el estado anterior en caso de error
      setMarkedNotes(prev => {
        const wasMarked = !prev.includes(id);
        return wasMarked 
          ? [...prev, id] 
          : prev.filter(noteId => noteId !== id);
      });
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
        
        toast.success(response.note.is_pinned ? 'Nota fijada' : 'Nota desfijada');
      }
    } catch (error) {
      console.error('Error al fijar/desfijar nota:', error);
      toast.error('Error al actualizar la nota');
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
  
  const handleExportNote = (format: string, noteId?: string) => {
    if (!noteId) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const content = note.content;
    const title = note.title || 'Nota sin título';

    switch (format) {
      case 'pdf':
        exportAsPDFHelper(title, content, {
          images: note.images,
          imageBaseUrl: process.env.REACT_APP_API_URL?.replace('/api', '') ?? ''
        });
        break;
      case 'txt':
        exportAsTXT(title, content);
        break;
      default:
        break;
    }
  };

  const exportAsTXT = (title: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title}.txt`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    document.body.removeChild(element);
    toast.success('Nota exportada como TXT');
  };

  // Inicialización de datos
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return {
    notes,
    trashNotes,
    newNote,
    editingNote,
    markedNotes,
    filteredNotes,
    isLoading,
    sortKey,
    loadNotes,
    loadTrashNotes,
    handleCreateNote,
    handleNoteChange,
    handleUpdateNote,
    handleImageUpload,
    handleDeleteImage,
    handleDeleteNote,
    handleDeleteMarkedNotes,
    handleToggleMark,
    handleTogglePin,
    handleRestoreNote,
    handleEmptyTrash,
    setNewNote,
    setMarkedNotes,
    setFilteredNotes,
    forceReorder,
    handleFilteredNotes,
    handleExportNote
  };
}
