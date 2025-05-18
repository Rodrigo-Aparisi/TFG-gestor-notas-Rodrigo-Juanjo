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
  const [newGroup, setNewGroup] = useState({ name: '', color: '#f1c40f' });

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
      if (!newGroup.name.trim()) {
        if (showFeedback) showFeedback('El nombre del grupo es requerido');
        return;
      }
  
      const newGroupData = {
        name: newGroup.name.trim(),
        color: newGroup.color || '#f1c40f',
        noteIds: markedNotes
      };
  
      const response = await noteService.createGroup(newGroupData);
      
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
        setNewGroup({ name: '', color: '#f1c40f' });
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
    newGroup,
    setActiveGroup,
    handleGroupSelect,
    handleCreateGroup,
    handleDeleteGroup,
    setShowGroupModal,
    setNewGroup
  };
}
