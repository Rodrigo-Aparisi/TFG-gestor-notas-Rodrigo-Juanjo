import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { noteService } from '../services/api';
import { Group, GroupResponse } from '../types';

export function useGroups(showFeedback?: (message: string) => void) {
  const navigate = useNavigate();
  const location = useLocation();
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 'main',
      name: 'Todas las notas',
      color: '#f1c40f',
      isDefault: true,
      noteIds: []
    }
  ]);
  const [activeGroup, setActiveGroup] = useState<string>('main');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newNoteGroup, setNoteNewGroup] = useState({ name: '', color: '#f1c40f' });

  // Determinar el grupo activo basado en la URL al cargar
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/trash') {
      setActiveGroup('trash');
    } else if (path === '/notes') {
      const searchParams = new URLSearchParams(location.search);
      const groupParam = searchParams.get('group');
      if (groupParam) {
        setActiveGroup(groupParam);
      } else {
        setActiveGroup('main');
      }
    }
  }, [location.pathname, location.search]);

  const handleGroupSelect = useCallback((groupId: string) => {
    setActiveGroup(groupId);
    
    // Navegar según el grupo seleccionado
    if (groupId === 'trash') {
      navigate('/trash');
    } else if (groupId === 'main') {
      navigate('/notes');
    } else {
      navigate(`/notes?group=${groupId}`);
    }
  }, [navigate]);

  const handleCreateGroup = async (markedNotes: string[]) => {
    try {
      if (!newNoteGroup.name.trim()) {
        if (showFeedback) showFeedback('El nombre del grupo es requerido');
        return;
      }
  
      const newNoteGroupData = {
        name: newNoteGroup.name.trim(),
        color: newNoteGroup.color || '#f1c40f',
        noteIds: markedNotes
      };
  
      const response = await noteService.createGroup(newNoteGroupData);
      
      if (response && response.group) {
        const formattedGroup: Group = {
          id: response.group.id.toString(),
          name: response.group.name,
          color: response.group.color,
          noteIds: Array.isArray(response.group.note_ids) 
            ? response.group.note_ids.filter((id): id is string => id !== null)
            : [],
          isDefault: false
        };
  
        setGroups(prev => [...prev, formattedGroup]);
        setShowGroupModal(false);
        setNoteNewGroup({ name: '', color: '#f1c40f' });
        if (showFeedback) showFeedback('Grupo creado exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al crear grupo:', error);
      if (showFeedback) showFeedback('Error al crear el grupo');
      return false;
    }
  };

  const handleUpdateGroup = async (groupId: string, groupData: { name: string; color: string }) => {
    try {
      console.log("Enviando datos al servidor:", { groupId, groupData }); // Para depuración
      
      const response = await noteService.updateGroup(groupId, groupData);
      
      console.log("Respuesta del servidor:", response); // Para depuración
      
      if (response && response.group) {
        setGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { 
                ...group, 
                name: response.group.name, 
                color: response.group.color 
              } 
            : group
        ));
        
        if (showFeedback) showFeedback('Grupo actualizado exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error completo al actualizar grupo:', error);
      console.error('Mensaje de error:', error.message);
      console.error('Datos de respuesta:', error.response?.data);
      
      if (showFeedback) showFeedback(`Error al actualizar el grupo: ${error.response?.data?.message || error.message}`);
      return false;
    }
  };

  const handleMoveGroup = async (groupId: string, direction: 'up' | 'down') => {
    // Encontrar el grupo y su índice, excluyendo grupos predeterminados como 'main' y 'trash'
    const reorderableGroups = groups.filter(g => !g.isDefault && g.id !== 'trash');
    const groupIndex = reorderableGroups.findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) return;
    
    // Determinar la nueva posición
    const newIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    
    // Verificar límites
    if (newIndex < 0 || newIndex >= reorderableGroups.length) return;
    
    // Crear una copia del array de grupos reordenables y reordenar
    const newReorderableGroups = [...reorderableGroups];
    const temp = newReorderableGroups[groupIndex];
    newReorderableGroups[groupIndex] = newReorderableGroups[newIndex];
    newReorderableGroups[newIndex] = temp;
    
    // Reconstruir el array completo de grupos
    const defaultGroups = groups.filter(g => g.isDefault || g.id === 'trash');
    const newGroups = [...defaultGroups.filter(g => g.id === 'main'), ...newReorderableGroups, ...defaultGroups.filter(g => g.id === 'trash')];
    
    // Actualizar estado local inmediatamente para UI responsiva
    setGroups(newGroups);
    
    // Enviar al servidor
    try {
      // Solo enviar los IDs de los grupos reordenables
      const groupIds = newReorderableGroups.map(g => g.id);
      
      await noteService.reorderGroups(groupIds);
    } catch (error) {
      console.error('Error al reordenar grupos:', error);
      if (showFeedback) showFeedback('Error al reordenar los grupos');
      
      // Revertir cambios en caso de error
      setGroups(groups);
    }
  };

  const handleAddNoteToGroup = async (groupId: string, noteId: string) => {
    try {
      // Verificar si la nota ya está en el grupo
      const group = groups.find(g => g.id === groupId);
      if (group && group.noteIds.includes(noteId)) {
        if (showFeedback) showFeedback('La nota ya está en este grupo');
        return true; // Ya está en el grupo, consideramos que fue exitoso
      }
      
      // Proceder a añadir la nota al grupo
      await noteService.addNoteToGroup(groupId, noteId);
      
      // Actualizar el estado local
      setGroups(prev => prev.map(group => {
        if (group.id === groupId && !group.noteIds.includes(noteId)) {
          return {
            ...group,
            noteIds: [...group.noteIds, noteId]
          };
        }
        return group;
      }));
      
      if (showFeedback) showFeedback('Nota añadida al grupo exitosamente');
      return true;
    } catch (error) {
      console.error('Error al añadir nota al grupo:', error);
      if (showFeedback) showFeedback('Error al añadir la nota al grupo');
      return false;
    }
  };

  const handleRemoveNoteFromGroup = async (groupId: string, noteId: string) => {
    try {
      await noteService.removeNoteFromGroup(groupId, noteId);
      
      // Actualizar el estado local
      setGroups(prev => prev.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            noteIds: group.noteIds.filter(id => id !== noteId)
          };
        }
        return group;
      }));
      
      if (showFeedback) showFeedback('Nota eliminada del grupo exitosamente');
      return true;
    } catch (error) {
      console.error('Error al eliminar nota del grupo:', error);
      if (showFeedback) showFeedback('Error al eliminar la nota del grupo');
      return false;
    }
  };

  const handleDeleteGroup = async (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      try {
        await noteService.deleteGroup(groupId);
        
        setGroups(prev => prev.filter(group => group.id !== groupId));
        if (activeGroup === groupId) {
          setActiveGroup('main');
          navigate('/notes');
        }
        if (showFeedback) showFeedback('Grupo eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar grupo:', error);
        if (showFeedback) showFeedback('Error al eliminar el grupo');
      }
    }
  };

  // Cargar grupos
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await noteService.getGroups();
        
        if (response && response.groups) {
          const formattedGroups: Group[] = response.groups.map((group: GroupResponse) => ({
            id: group.id.toString(),
            name: group.name,
            color: group.color,
            noteIds: Array.isArray(group.note_ids) 
              ? group.note_ids.filter((id): id is string => id !== null)
              : [],
            isDefault: false
          }));
          
          setGroups(prev => {
            const mainGroup = prev.find(g => g.isDefault);
            return mainGroup ? [mainGroup, ...formattedGroups] : formattedGroups;
          });
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
  
    fetchGroups();
  }, []);

  return {
    groups,
    activeGroup,
    showGroupModal,
    newNoteGroup,
    setActiveGroup,
    handleGroupSelect,
    handleCreateGroup,
    handleDeleteGroup,
    handleMoveGroup,
    setShowGroupModal,
    setNoteNewGroup,
    handleUpdateGroup,
    handleAddNoteToGroup,
    handleRemoveNoteFromGroup
  };
}