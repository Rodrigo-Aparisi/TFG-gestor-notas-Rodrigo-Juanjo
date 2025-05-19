import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { authService } from '../services/auth';
import { Note, UpdateNoteData } from '../types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashNotes, setTrashNotes] = useState<Note[]>([]);
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
      
      if (window.location.pathname === '/trash') {
        setTrashNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        showFeedback('Nota eliminada permanentemente');
      } else {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        setMarkedNotes(prev => prev.filter(noteId => noteId !== id));
        showFeedback('Nota movida a la papelera');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showFeedback('Error al procesar la nota');
    }
  };

  const handleRestoreNote = async (id: string) => {
    try {
      const response = await noteService.restoreNote(id);
      if (response && response.note) {
        setTrashNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        showFeedback('Nota restaurada exitosamente');
      }
    } catch (error) {
      console.error('Error al restaurar nota:', error);
      showFeedback('Error al restaurar la nota');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('¿Estás seguro de vaciar la papelera? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await noteService.emptyTrash();
      setTrashNotes([]);
      showFeedback('Papelera vaciada exitosamente');
    } catch (error) {
      console.error('Error al vaciar papelera:', error);
      showFeedback('Error al vaciar la papelera');
    }
  };

  const handleDeleteMarkedNotes = async () => {
    if (!markedNotes.length) return;
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${markedNotes.length} nota(s)?`)) {
      try {
        if (window.location.pathname === '/trash') {
          await Promise.all(markedNotes.map(id => noteService.deleteNote(id)));
          setTrashNotes(prevNotes => prevNotes.filter(note => !markedNotes.includes(note.id)));
          showFeedback('Notas eliminadas permanentemente');
        } else {
          await Promise.all(markedNotes.map(id => noteService.deleteNote(id)));
          setNotes(prevNotes => prevNotes.filter(note => !markedNotes.includes(note.id)));
          showFeedback('Notas movidas a la papelera');
        }
        setMarkedNotes([]);
      } catch (error) {
        console.error('Error al procesar notas:', error);
        showFeedback('Error al procesar las notas');
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
  
  const handleExportNote = (format: string, noteId?: string) => {
    if (!noteId) return;
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const content = note.content;
    const title = note.title || 'Nota sin título';
    
    switch (format) {
      case 'pdf':
        exportAsPDF(title, content, note);
        break;
      case 'txt':
        exportAsTXT(title, content);
        break;
      default:
        break;
    }
  };

  const exportAsPDF = (title: string, content: string, note: Note) => {
    try {
      showFeedback('Preparando exportación a PDF...');

      // Eliminar iframe existente si hay alguno
      const existingIframe = document.getElementById('pdf-print-frame');
      if (existingIframe) {
        document.body.removeChild(existingIframe);
      }

      // Crear un iframe oculto
      const iframe = document.createElement('iframe');
      iframe.id = 'pdf-print-frame';
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);

      // Formato simple para el contenido
      const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\n/g, '<br>');

      // Esperar a que el iframe esté cargado
      iframe.onload = () => {
        // Acceder al documento dentro del iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          showFeedback('Error al crear el documento PDF');
          return;
        }

        // Escribir el contenido HTML en el iframe
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 20px;
                color: #333;
              }
              h1 {
                color: #333;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
              }
              .content {
                margin-top: 20px;
              }
              .images {
                margin-top: 30px;
                display: flex;
                flex-direction: column;
                gap: 20px;
                max-width: 20%;
              }
              .images img {
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="content">${formattedContent}</div>
            
            ${note.images && note.images.length > 0 ? `
              <div class="images">
                <h2>Imágenes adjuntas</h2>
                ${note.images.map(img => `<img src="${process.env.REACT_APP_API_URL?.replace('/api', '')}${img}" alt="Imagen adjunta">`).join('')}
              </div>
            ` : ''}
          </body>
          </html>
        `);

        iframeDoc.close();

        // Esperar un momento para que se cargue todo el contenido
        setTimeout(() => {
          try {
            // Imprimir el iframe (esto abrirá el diálogo de impresión)
            iframe.contentWindow?.print();
            showFeedback('Documento preparado para descargar como PDF');
          } catch (err) {
            console.error('Error al imprimir:', err);
            showFeedback('Error al generar el PDF');
          }
        }, 500);
      };

      // Iniciar la carga del iframe con un documento en blanco
      iframe.src = 'about:blank';

    } catch (error) {
      console.error('Error al exportar como PDF:', error);
      showFeedback('Error al exportar como PDF');
    }
  };


  const exportAsTXT = (title: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showFeedback('Nota exportada como TXT');
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
    feedback,
    sortKey,
    showFeedback,
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
