import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import {
  UserGroup,
  GroupNote,
  CreateGroupData,
  AddGroupMemberData,
  CreateGroupNoteData,
  getErrorMessage,
} from "../types";

export const useUserGroups = () => {
  // Estados para grupos y miembros
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);

  // Estados para notas de grupo
  const [groupNotes, setGroupNotes] = useState<GroupNote[]>([]);
  const [newNote, setNewNote] = useState<CreateGroupNoteData>({
    title: "",
    content: "",
  });
  const [editingNote, setEditingNote] = useState<Record<string, GroupNote>>({});

  // Estados para modales
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Estados para grupo nuevo
  const [newUserGroup, setUserNewGroup] = useState<CreateGroupData>({
    name: "",
    description: "",
  });

  // Estados de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Mostrar mensaje de feedback
  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }, []);

  // Obtener todos los grupos del usuario
  const fetchUserGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/user-groups");

      // Asegúrate de que siempre sea un array, incluso si la API devuelve algo inesperado
      const groups = response.data?.groups || [];
      setUserGroups(Array.isArray(groups) ? groups : []);
    } catch (err: unknown) {
      console.error("Error al cargar los grupos:", err);
      setError(getErrorMessage(err));
      showFeedback("Error al cargar los grupos");
      setUserGroups([]); // Siempre establece un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  // Obtener notas de un grupo específico
  const fetchGroupNotes = useCallback(
    async (groupId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/user-groups/${groupId}/notes`);

        // Asegúrate de que siempre sea un array
        const notes = response.data?.notes || [];
        setGroupNotes(Array.isArray(notes) ? notes : []);
      } catch (err: unknown) {
        console.error("Error al cargar las notas del grupo:", err);
        setError(getErrorMessage(err));
        showFeedback("Error al cargar las notas del grupo");
        setGroupNotes([]);
      } finally {
        setLoading(false);
      }
    },
    [showFeedback]
  );

  // Crear un nuevo grupo
  const createGroup = useCallback(async () => {
    if (!newUserGroup.name.trim()) {
      showFeedback("El nombre del grupo es obligatorio");
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/user-groups", newUserGroup);
      setUserGroups((prev) => [...prev, response.data.group]);
      setUserNewGroup({ name: "", description: "" });
      setShowCreateGroupModal(false);
      showFeedback("Grupo creado correctamente");
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      showFeedback("Error al crear el grupo");
      return false;
    } finally {
      setLoading(false);
    }
  }, [newUserGroup, showFeedback]);

  // Añadir un miembro al grupo
  const addGroupMember = useCallback(
    async (data: AddGroupMemberData) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.post(
          `/user-groups/${data.groupId}/members`,
          {
            username: data.username,
            role: data.role || "member",
          }
        );

        // Actualizar el grupo en la lista
        setUserGroups((prev) =>
          prev.map((group) =>
            group.id === data.groupId
              ? {
                  ...group,
                  members: [...(group.members || []), response.data.member],
                }
              : group
          )
        );

        // Si es el grupo seleccionado, actualizarlo también
        if (selectedGroup?.id === data.groupId) {
          setSelectedGroup((prev) =>
            prev
              ? {
                  ...prev,
                  members: [...(prev.members || []), response.data.member],
                }
              : null
          );
        }

        showFeedback("Miembro añadido correctamente");
        return true;
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        showFeedback("Error al añadir miembro al grupo");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedGroup, showFeedback]
  );

  // Eliminar un miembro del grupo
  const removeGroupMember = useCallback(
    async (groupId: string, userId: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.delete(`/user-groups/${groupId}/members/${userId}`);

        // Actualizar el grupo en la lista
        setUserGroups((prev) =>
          prev.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  members: (group.members || []).filter(
                    (m) => m.user_id !== userId
                  ),
                }
              : group
          )
        );

        // Si es el grupo seleccionado, actualizarlo también
        if (selectedGroup?.id === groupId) {
          setSelectedGroup((prev) =>
            prev
              ? {
                  ...prev,
                  members: (prev.members || []).filter(
                    (m) => m.user_id !== userId
                  ),
                }
              : null
          );
        }

        showFeedback("Miembro eliminado correctamente");
        return true;
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        showFeedback("Error al eliminar miembro del grupo");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedGroup, showFeedback]
  );

  // Crear una nota en un grupo
  const createGroupNote = useCallback(async () => {
    if (!selectedGroup) return false;
    if (!newNote.title.trim()) {
      showFeedback("El título es obligatorio");
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        `/user-groups/${selectedGroup.id}/notes`,
        newNote
      );
      setGroupNotes((prev) => [...prev, response.data.note]);
      setNewNote({ title: "", content: "" });
      showFeedback("Nota creada correctamente");
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      showFeedback("Error al crear la nota en el grupo");
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, newNote, showFeedback]);

  // Manejar cambios en una nota
  const handleNoteChange = useCallback((noteId: string, field: keyof GroupNote, value: string | boolean | string[] | null) => {
    setEditingNote(prev => {
      const note = prev[noteId] || groupNotes.find(n => n.id === noteId);
      if (!note) return prev;
      
      return {
        ...prev,
        [noteId]: {
          ...(prev[noteId] || note),
          [field]: value
        }
      };
    });
  }, [groupNotes]);

  // Actualizar una nota de grupo
  const updateGroupNote = useCallback(async (noteId: string, field?: keyof GroupNote) => {
    if (!selectedGroup) return false;
    
    // Obtener la nota editada y la original
    const editedNote = editingNote[noteId];
    const originalNote = groupNotes.find(note => note.id === noteId);
    
    if (!originalNote) return false;
    
    // Crear un objeto con los datos a actualizar
    const updateData: Record<string, any> = {};
    
    if (field === 'title' && editedNote) {
      // Validar título vacío
      if (!editedNote.title?.trim()) {
        showFeedback('El título no puede estar vacío');
        return false;
      }
      updateData.title = editedNote.title;
    } 
    else if (field === 'content' && editedNote) {
      updateData.content = editedNote.content || '';
    }
    else if (field === 'images' && editedNote && editedNote.images) {
      updateData.images = editedNote.images;
    }
    else if (field === 'color' && editedNote && editedNote.color) {
      updateData.color = editedNote.color;
    }
    else if (!field && editedNote) {
      // Actualización completa de la nota
      if (!editedNote.title?.trim()) {
        showFeedback('El título no puede estar vacío');
        return false;
      }
      
      updateData.title = editedNote.title;
      updateData.content = editedNote.content || '';
      
      if (editedNote.color) {
        updateData.color = editedNote.color;
      }
      
      if (editedNote.images) {
        updateData.images = editedNote.images;
      }
    }
    else {
      // No hay datos para actualizar
      return true;
    }
    
    // Verificar si hay cambios reales que guardar
    let hasChanges = false;
    if (field && field in updateData) {
      hasChanges = JSON.stringify(originalNote[field]) !== JSON.stringify(updateData[field]);
    } else {
      hasChanges = Object.keys(updateData).some(key => 
        JSON.stringify(originalNote[key as keyof GroupNote]) !== JSON.stringify(updateData[key])
      );
    }
    
    if (!hasChanges) {
      return true;  // No hay cambios, consideramos exitoso
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(
        `/user-groups/${selectedGroup.id}/notes/${noteId}`,
        updateData
      );
      
      if (response.data && response.data.note) {
        // Actualizar el estado local con la respuesta
        setGroupNotes(prev => 
          prev.map(note => note.id === noteId ? response.data.note : note)
        );
        
        showFeedback('Nota actualizada correctamente');
        return true;
      }
      
      return false;
    } catch (err: unknown) {
      console.error('Error al actualizar nota:', err);
      setError(getErrorMessage(err));
      showFeedback('Error al actualizar la nota del grupo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, editingNote, groupNotes, showFeedback]);

  // Subir una imagen para una nota
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    if (!e.target.files || !e.target.files[0] || !selectedGroup) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
    
    setLoading(true);
    showFeedback('Subiendo imagen...');
    
    try {
      const response = await api.post('/uploads/group-note-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.data && response.data.data.imageUrl) {
        const imageUrl = response.data.data.imageUrl;
        const note = groupNotes.find(n => n.id === noteId);
        
        if (note) {
          const updatedImages = [...(note.images || []), imageUrl];
          
          // Actualizar estado local
          setEditingNote(prev => ({
            ...prev,
            [noteId]: {
              ...(prev[noteId] || note),
              images: updatedImages
            }
          }));
          
          // Actualizar en el servidor
          await api.put(`/user-groups/${selectedGroup.id}/notes/${noteId}`, {
            images: updatedImages
          });
          
          // Actualizar el estado de notas
          setGroupNotes(prev => 
            prev.map(n => n.id === noteId ? {
              ...n,
              images: updatedImages
            } : n)
          );
          
          showFeedback('Imagen añadida correctamente');
        }
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
      showFeedback('Error al subir la imagen');
    } finally {
      setLoading(false);
      // Limpiar el input de archivo
      e.target.value = '';
    }
  }, [selectedGroup, groupNotes, showFeedback]);

  // Eliminar una imagen de una nota
  const handleDeleteImage = useCallback(async (noteId: string, imageIndex: number) => {
    if (!selectedGroup) return;
    
    const note = groupNotes.find(n => n.id === noteId);
    if (!note || !note.images || imageIndex >= note.images.length) return;
    
    const updatedImages = [...note.images];
    updatedImages.splice(imageIndex, 1);
    
    setLoading(true);
    
    try {
      // Actualizar en el servidor
      await api.put(`/user-groups/${selectedGroup.id}/notes/${noteId}`, {
        images: updatedImages
      });
      
      // Actualizar estado local
      setGroupNotes(prev => 
        prev.map(n => n.id === noteId ? {
          ...n,
          images: updatedImages
        } : n)
      );
      
      showFeedback('Imagen eliminada correctamente');
    } catch (err) {
      console.error('Error al eliminar imagen:', err);
      showFeedback('Error al eliminar la imagen');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, groupNotes, showFeedback]);

  // Marcar/desmarcar una nota como importante
  const toggleMarkGroupNote = useCallback(async (groupId: string, noteId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.patch(
        `/user-groups/${groupId}/notes/${noteId}/mark`
      );

      // Actualizar la nota en el estado
      setGroupNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, is_marked: !note.is_marked } : note
        )
      );

      showFeedback("Nota marcada/desmarcada correctamente");
      return response.data;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      showFeedback("Error al actualizar la nota");
      return false;
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  // Eliminar una nota del grupo
  const deleteGroupNote = useCallback(
    async (noteId: string) => {
      if (!selectedGroup) return false;

      setLoading(true);
      setError(null);
      try {
        await api.delete(`/user-groups/${selectedGroup.id}/notes/${noteId}`);
        setGroupNotes((prev) => prev.filter((note) => note.id !== noteId));
        showFeedback("Nota eliminada correctamente");
        return true;
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        showFeedback("Error al eliminar la nota del grupo");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedGroup, showFeedback]
  );

  // Marcar/desmarcar una nota como importante
  const togglePinGroupNote = useCallback(
    async (groupId: string, noteId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.patch(
          `/user-groups/${groupId}/notes/${noteId}/pin`
        );

        // Actualizar la nota en el estado
        setGroupNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, is_pinned: !note.is_pinned } : note
          )
        );

        showFeedback("Nota actualizada correctamente");
        return response.data;
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        showFeedback("Error al actualizar la nota");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [showFeedback]
  );

  // Exportar una nota
  const handleExportNote = useCallback((format: string, noteId?: string) => {
    if (!noteId) return;
    
    const note = groupNotes.find(n => n.id === noteId);
    if (!note) return;
    
    if (format === 'pdf') {
      // Exportar como PDF usando iframe para imprimir
      exportAsPDF(note);
    } else if (format === 'txt') {
      // Exportar como TXT
      exportAsTXT(note);
    }
  }, [groupNotes, showFeedback]);
  
  // Función para exportar como PDF
  const exportAsPDF = (note: GroupNote) => {
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
      const formattedContent = (note.content || '')
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
            <title>${note.title || 'Sin título'}</title>
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
              .note-info {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
              }
            </style>
          </head>
          <body>
            <h1>${note.title || 'Sin título'}</h1>
            <div class="note-info">
              Por: ${note.created_by_username || 'Usuario'}
            </div>
            <div class="content">${formattedContent}</div>
            
            ${note.images && note.images.length > 0 ? `
              <div class="images">
                <h2>Imágenes adjuntas</h2>
                ${note.images.map(img => `<img src="${img}" alt="Imagen adjunta">`).join('')}
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

  // Función para exportar como TXT
  const exportAsTXT = (note: GroupNote) => {
    const content = `${note.title || 'Sin título'}\n\nPor: ${note.created_by_username || 'Usuario'}\n\n${note.content || ''}`;
    const blob = new Blob([content], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    
    const element = document.createElement('a');
    element.href = url;
    element.download = `${note.title || 'nota'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
    
    showFeedback('Nota exportada como TXT');
  };

  // Insertar lista en una nota
  const insertList = useCallback((noteId: string, type: 'bullet' | 'number') => {
    const editedNote = editingNote[noteId];
    const originalNote = groupNotes.find(note => note.id === noteId);
    
    if (!originalNote) return;
    
    const content = (editedNote?.content || originalNote.content || '') + '\n';
    let newContent = content;
    
    if (type === 'bullet') {
      newContent += '• Elemento 1\n• Elemento 2\n• Elemento 3';
    } else {
      newContent += '1. Elemento 1\n2. Elemento 2\n3. Elemento 3';
    }
    
    handleNoteChange(noteId, 'content', newContent);
  }, [editingNote, groupNotes, handleNoteChange]);

  // Manejar teclas especiales
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string) => {
    // Tab para indentación
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      
      // Insertar tabulación
      target.value = value.substring(0, start) + '    ' + value.substring(end);
      
      // Mover el cursor
      target.selectionStart = target.selectionEnd = start + 4;
      
      // Actualizar contenido
      handleNoteChange(noteId, 'content', target.value);
    }
    
    // Auto-listas
    if (e.key === 'Enter') {
      const target = e.currentTarget;
      const value = target.value;
      const start = target.selectionStart;
      
      // Obtener la línea actual
      const currentLine = value.substring(0, start).split('\n').pop() || '';
      
      // Detectar listas
      const bulletMatch = currentLine.match(/^(\s*)([•*-])\s(.+)$/);
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.?\s(.+)$/);
      
      if (bulletMatch) {
        e.preventDefault();
        
        const [, indent, bullet] = bulletMatch;
        const newItem = `\n${indent}${bullet} `;
        
        // Insertar nuevo elemento
        target.value = value.substring(0, start) + newItem + value.substring(start);
        
        // Mover el cursor
        target.selectionStart = target.selectionEnd = start + newItem.length;
        
        // Actualizar contenido
        handleNoteChange(noteId, 'content', target.value);
      } 
      else if (numberMatch) {
        e.preventDefault();
        
        const [, indent, number] = numberMatch;
        const nextNumber = parseInt(number) + 1;
        const newItem = `\n${indent}${nextNumber}. `;
        
        // Insertar nuevo elemento
        target.value = value.substring(0, start) + newItem + value.substring(start);
        
        // Mover el cursor
        target.selectionStart = target.selectionEnd = start + newItem.length;
        
        // Actualizar contenido
        handleNoteChange(noteId, 'content', target.value);
      }
    }
  }, [handleNoteChange]);

  // Seleccionar un grupo y cargar sus notas
  const selectGroup = useCallback(
    async (groupId: string) => {
      const group = userGroups.find((g) => g.id === groupId) || null;
      setSelectedGroup(group);
      if (group) {
        await fetchGroupNotes(groupId);
      } else {
        setGroupNotes([]);
      }
    },
    [userGroups, fetchGroupNotes]
  );

  const handleGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await api.post(
        "/user-groups/notes/upload-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.data && response.data.data.imageUrl) {
        setNewNote((prev) => ({
          ...prev,
          images: [...(prev.images || []), response.data.data.imageUrl],
        }));
        showFeedback("Imagen subida correctamente");
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      showFeedback("Error al subir la imagen");
    }
  };

  const handleNoteImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await api.post(
        "/user-groups/notes/upload-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.data && response.data.data.imageUrl) {
        // Actualizar la nota con la nueva imagen
        const note = groupNotes.find((n) => n.id === noteId);
        if (note) {
          const updatedNote = {
            ...note,
            images: [...(note.images || []), response.data.data.imageUrl],
          };

          setEditingNote({ ...editingNote, [noteId]: updatedNote });

          // Llamar a updateGroupNote para guardar los cambios
          await updateGroupNote(noteId);

          showFeedback("Imagen subida correctamente");
        }
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      showFeedback("Error al subir la imagen");
    }
  };

  const handleDeleteNoteImage = async (noteId: string, imageIndex: number) => {
    try {
      const note = groupNotes.find((n) => n.id === noteId);
      if (!note || !note.images || note.images.length <= imageIndex) return;

      const updatedImages = [...note.images];
      updatedImages.splice(imageIndex, 1);

      const updatedNote = {
        ...note,
        images: updatedImages,
      };

      setEditingNote({ ...editingNote, [noteId]: updatedNote });

      // Llamar a la API para eliminar la imagen
      await api.delete(`/user-groups/notes/${noteId}/images/${imageIndex}`);

      // Actualizar la nota
      await updateGroupNote(noteId);

      showFeedback("Imagen eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar la imagen:", error);
      showFeedback("Error al eliminar la imagen");
    }
  };


  // Cargar grupos al montar el componente
  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  return {
    userGroups,
    selectedGroup,
    groupNotes,
    loading,
    error,
    feedback,
    newUserGroup,
    showCreateGroupModal,
    showAddMemberModal,
    newNote,
    editingNote,
    fetchUserGroups,
    fetchGroupNotes,
    createGroup,
    addGroupMember,
    removeGroupMember,
    createGroupNote,
    updateGroupNote,
    handleNoteChange,
    deleteGroupNote,
    selectGroup,
    togglePinGroupNote,
    toggleMarkGroupNote,
    handleImageUpload,
    handleDeleteImage,
    handleExportNote,
    insertList,
    handleKeyDown,
    showFeedback,
    setUserNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote,
    handleGroupImageUpload,
    handleNoteImageUpload,
    handleDeleteNoteImage,
  };
};