import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { UserGroup, GroupNote, CreateGroupData, AddGroupMemberData, CreateGroupNoteData } from '../types';

export const useUserGroups = () => {
  // Estados para grupos y miembros
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  
  // Estados para notas de grupo
  const [groupNotes, setGroupNotes] = useState<GroupNote[]>([]);
  const [newNote, setNewNote] = useState<CreateGroupNoteData>({ title: '', content: '' });
  const [editingNote, setEditingNote] = useState<Record<string, GroupNote>>({});
  
  // Estados para modales
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  // Estados para grupo nuevo
  const [newUserGroup, setUserNewGroup] = useState<CreateGroupData>({ name: '', description: '' });
  
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
      console.log('Fetching user groups...');
      const response = await api.get('/user-groups');
      console.log('Response:', response.data);
      
      // Asegúrate de que siempre sea un array, incluso si la API devuelve algo inesperado
      const groups = response.data?.groups || [];
      setUserGroups(Array.isArray(groups) ? groups : []);
    } catch (err: any) {
      console.error('Error al cargar los grupos:', err);
      setError(err.message || 'Error al cargar los grupos');
      showFeedback('Error al cargar los grupos');
      setUserGroups([]); // Siempre establece un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  // Obtener notas de un grupo específico
  const fetchGroupNotes = useCallback(async (groupId: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching group notes for group:', groupId);
      const response = await api.get(`/user-groups/${groupId}/notes`);
      console.log('Group notes response:', response.data);
      
      // Asegúrate de que siempre sea un array
      const notes = response.data?.notes || [];
      setGroupNotes(Array.isArray(notes) ? notes : []);
    } catch (err: any) {
      console.error('Error al cargar las notas del grupo:', err);
      setError(err.message || 'Error al cargar las notas del grupo');
      showFeedback('Error al cargar las notas del grupo');
      setGroupNotes([]);
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  // Crear un nuevo grupo
  const createGroup = useCallback(async () => {
    if (!newUserGroup.name.trim()) {
      showFeedback('El nombre del grupo es obligatorio');
      return false;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/user-groups', newUserGroup);
      setUserGroups(prev => [...prev, response.data.group]);
      setUserNewGroup({ name: '', description: '' });
      setShowCreateGroupModal(false);
      showFeedback('Grupo creado correctamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al crear el grupo');
      showFeedback('Error al crear el grupo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [newUserGroup, showFeedback]);

  // Añadir un miembro al grupo
  const addGroupMember = useCallback(async (data: AddGroupMemberData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/user-groups/${data.groupId}/members`, {
        username: data.username,
        role: data.role || 'member'
      });
      
      // Actualizar el grupo en la lista
      setUserGroups(prev => 
        prev.map(group => 
          group.id === data.groupId 
            ? { 
                ...group, 
                members: [...(group.members || []), response.data.member] 
              } 
            : group
        )
      );
      
      // Si es el grupo seleccionado, actualizarlo también
      if (selectedGroup?.id === data.groupId) {
        setSelectedGroup(prev => 
          prev ? { 
            ...prev, 
            members: [...(prev.members || []), response.data.member] 
          } : null
        );
      }
      
      showFeedback('Miembro añadido correctamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al añadir miembro al grupo');
      showFeedback('Error al añadir miembro al grupo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, showFeedback]);

  // Eliminar un miembro del grupo
  const removeGroupMember = useCallback(async (groupId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/user-groups/${groupId}/members/${userId}`);
      
      // Actualizar el grupo en la lista
      setUserGroups(prev => 
        prev.map(group => 
          group.id === groupId 
            ? { 
                ...group, 
                members: (group.members || []).filter(m => m.user_id !== userId) 
              } 
            : group
        )
      );
      
      // Si es el grupo seleccionado, actualizarlo también
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(prev => 
          prev ? { 
            ...prev, 
            members: (prev.members || []).filter(m => m.user_id !== userId) 
          } : null
        );
      }
      
      showFeedback('Miembro eliminado correctamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar miembro del grupo');
      showFeedback('Error al eliminar miembro del grupo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, showFeedback]);

  // Crear una nota en un grupo
  const createGroupNote = useCallback(async () => {
    if (!selectedGroup) return false;
    if (!newNote.title.trim()) {
      showFeedback('El título es obligatorios');
      return false;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/user-groups/${selectedGroup.id}/notes`, newNote);
      setGroupNotes(prev => [...prev, response.data.note]);
      setNewNote({ title: '', content: '' });
      showFeedback('Nota creada correctamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al crear la nota en el grupo');
      showFeedback('Error al crear la nota en el grupo');
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
          ...note,
          [field]: value
        }
      };
    });
  }, [groupNotes]);

  // Actualizar una nota de grupo
  const updateGroupNote = useCallback(async (noteId: string) => {
    if (!selectedGroup) return false;
    const updatedNote = editingNote[noteId];
    if (!updatedNote) return false;
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/user-groups/${selectedGroup.id}/notes/${noteId}`, {
        title: updatedNote.title,
        content: updatedNote.content,
        images: updatedNote.images
      });
      
      setGroupNotes(prev => 
        prev.map(note => note.id === noteId ? response.data.note : note)
      );
      
      // Limpiar el estado de edición para esta nota
      setEditingNote(prev => {
        const newState = {...prev};
        delete newState[noteId];
        return newState;
      });
      
      showFeedback('Nota actualizada correctamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la nota del grupo');
      showFeedback('Error al actualizar la nota del grupo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, editingNote, showFeedback]);

  // Eliminar una nota del grupo
  const deleteGroupNote = useCallback(async (noteId: string) => {
    if (!selectedGroup) return false;
    
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/user-groups/${selectedGroup.id}/notes/${noteId}`);
      setGroupNotes(prev => prev.filter(note => note.id !== noteId));
      showFeedback('Nota eliminada correctamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la nota del grupo');
      showFeedback('Error al eliminar la nota del grupo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, showFeedback]);

  // Marcar/desmarcar una nota como importante
  const togglePinGroupNote = useCallback(async (groupId: string, noteId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.patch(`/user-groups/${groupId}/notes/${noteId}/pin`);
      
      // Actualizar la nota en el estado
      setGroupNotes(prev => 
        prev.map(note => 
          note.id === noteId 
            ? { ...note, is_pinned: !note.is_pinned } 
            : note
        )
      );
      
      showFeedback('Nota actualizada correctamente');
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la nota');
      showFeedback('Error al actualizar la nota');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  // Seleccionar un grupo y cargar sus notas
  const selectGroup = useCallback(async (groupId: string) => {
    const group = userGroups.find(g => g.id === groupId) || null;
    setSelectedGroup(group);
    if (group) {
      await fetchGroupNotes(groupId);
    } else {
      setGroupNotes([]);
    }
  }, [userGroups, fetchGroupNotes]);

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
    showFeedback,
    setUserNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote
  };
};