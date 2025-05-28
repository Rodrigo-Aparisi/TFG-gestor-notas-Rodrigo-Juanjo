import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import {
  UserGroup,
  GroupNote,
  CreateGroupData,
  AddGroupMemberData,
  CreateGroupNoteData,
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
      console.log("Fetching user groups...");
      const response = await api.get("/user-groups");
      console.log("Response:", response.data);

      // Asegúrate de que siempre sea un array, incluso si la API devuelve algo inesperado
      const groups = response.data?.groups || [];
      setUserGroups(Array.isArray(groups) ? groups : []);
    } catch (err: any) {
      console.error("Error al cargar los grupos:", err);
      setError(err.message || "Error al cargar los grupos");
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
        console.log("Fetching group notes for group:", groupId);
        const response = await api.get(`/user-groups/${groupId}/notes`);
        console.log("Group notes response:", response.data);

        // Asegúrate de que siempre sea un array
        const notes = response.data?.notes || [];
        setGroupNotes(Array.isArray(notes) ? notes : []);
      } catch (err: any) {
        console.error("Error al cargar las notas del grupo:", err);
        setError(err.message || "Error al cargar las notas del grupo");
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
    } catch (err: any) {
      setError(err.message || "Error al crear el grupo");
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
      } catch (err: any) {
        setError(err.message || "Error al añadir miembro al grupo");
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
      } catch (err: any) {
        setError(err.message || "Error al eliminar miembro del grupo");
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
    } catch (err: any) {
      setError(err.message || "Error al crear la nota en el grupo");
      showFeedback("Error al crear la nota en el grupo");
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, newNote, showFeedback]);

  // Manejar cambios en una nota
  const handleNoteChange = useCallback((noteId: string, field: keyof GroupNote, value: any) => {
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
    } catch (err: any) {
      console.error('Error al actualizar nota:', err);
      setError(err.message || 'Error al actualizar la nota del grupo');
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
    } catch (err: any) {
      setError(err.message || "Error al actualizar la nota");
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
      } catch (err: any) {
        setError(err.message || "Error al eliminar la nota del grupo");
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
      } catch (err: any) {
        setError(err.message || "Error al actualizar la nota");
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
    
    const content = note.content || '';
    const title = note.title || 'Nota sin título';
    
    if (format === 'txt') {
      // Exportar como TXT
      const element = document.createElement('a');
      const file = new Blob([content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${title}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showFeedback('Nota exportada como TXT');
    } else if (format === 'pdf') {
      // Crear un iframe oculto para el PDF
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);
      
      // Formatear contenido
      const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\n/g, '<br>');
      
      // Escribir HTML en el iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                line-height: 1.6;
              }
              h1 {
                color: #333;
                border-bottom: 1px solid #ddd;
              }
              .content {
                margin-top: 20px;
              }
              .images {
                margin-top: 30px;
              }
              .images img {
                max-width: 100%;
                margin-bottom: 10px;
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
                ${note.images.map(img => `<img src="${img}" alt="Imagen adjunta">`).join('')}
              </div>
            ` : ''}
          </body>
          </html>
        `);
        
        iframeDoc.close();
        
        // Imprimir el iframe como PDF
        setTimeout(() => {
          iframe.contentWindow?.print();
          showFeedback('Documento preparado para descargar como PDF');
        }, 500);
      }
    }
  }, [groupNotes, showFeedback]);

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
  };
};