import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Group } from '../types';

interface UseGroupActionsProps {
  markedNotes: string[];
  setMarkedNotes: React.Dispatch<React.SetStateAction<string[]>>;
  loadNotes: () => void;
  handleCreateGroup: (noteIds: string[]) => Promise<boolean>;
  handleUpdateGroup: (groupId: string, data: { name: string; color: string }) => Promise<boolean>;
  handleAddNoteToGroup: (groupId: string, noteId: string) => Promise<void>;
  handleRemoveNoteFromGroup: (groupId: string, noteId: string) => Promise<void>;
  setShowGroupModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNoteNewGroup: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>;
  newNoteGroup: { name: string; color: string };
  handleDeleteMarkedNotes: () => Promise<void>;
}

interface UseGroupActionsReturn {
  editingGroup: Group | null;
  setEditingGroup: React.Dispatch<React.SetStateAction<Group | null>>;
  handleEditGroup: (group: Group, event: React.MouseEvent) => void;
  handleSaveGroup: () => Promise<void>;
  handleDeleteMarkedNotesWithClear: () => Promise<void>;
  handleAddNotesToGroup: (groupId: string) => Promise<void>;
  handleRemoveNotesFromGroup: (groupId: string) => Promise<void>;
}

/**
 * Custom hook for group-related actions in Notes page
 * Handles group creation, editing, and bulk note operations
 */
export const useGroupActions = ({
  markedNotes,
  setMarkedNotes,
  loadNotes,
  handleCreateGroup,
  handleUpdateGroup,
  handleAddNoteToGroup,
  handleRemoveNoteFromGroup,
  setShowGroupModal,
  setNoteNewGroup,
  newNoteGroup,
  handleDeleteMarkedNotes
}: UseGroupActionsProps): UseGroupActionsReturn => {
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Create group with currently marked notes
  const handleCreateGroupWithMarkedNotes = useCallback(async () => {
    const result = await handleCreateGroup(markedNotes);
    if (result) {
      setMarkedNotes([]);
      return true;
    }
    return false;
  }, [handleCreateGroup, markedNotes, setMarkedNotes]);

  // Open edit modal for a group
  const handleEditGroup = useCallback((group: Group, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingGroup(group);
    setNoteNewGroup({ name: group.name, color: group.color });
    setShowGroupModal(true);
  }, [setNoteNewGroup, setShowGroupModal]);

  // Save group (create or update)
  const handleSaveGroup = useCallback(async () => {
    if (editingGroup) {
      // Editing existing group
      try {
        const result = await handleUpdateGroup(editingGroup.id, {
          name: newNoteGroup.name,
          color: newNoteGroup.color
        });

        if (result) {
          setEditingGroup(null);
          setShowGroupModal(false);
          setNoteNewGroup({ name: '', color: '#f1c40f' });
        }
      } catch (error) {
        console.error('Error updating group:', error);
        toast.error('Error al actualizar el grupo');
      }
    } else {
      // Creating new group
      const result = await handleCreateGroupWithMarkedNotes();
      if (result) {
        setShowGroupModal(false);
        setNoteNewGroup({ name: '', color: '#f1c40f' });
      }
    }
  }, [editingGroup, handleUpdateGroup, newNoteGroup, setShowGroupModal, setNoteNewGroup, handleCreateGroupWithMarkedNotes]);

  // Delete marked notes and clear selection
  const handleDeleteMarkedNotesWithClear = useCallback(async () => {
    try {
      await handleDeleteMarkedNotes();
      setMarkedNotes([]);
    } catch (error) {
      console.error('Error deleting marked notes:', error);
    }
  }, [handleDeleteMarkedNotes, setMarkedNotes]);

  // Add marked notes to a group
  const handleAddNotesToGroup = useCallback(async (groupId: string) => {
    try {
      const addPromises = markedNotes.map(noteId =>
        handleAddNoteToGroup(groupId, noteId)
      );

      await Promise.all(addPromises);
      toast.success('Notas añadidas al grupo exitosamente');
      setMarkedNotes([]);
      loadNotes();
    } catch (error) {
      console.error('Error adding notes to group:', error);
      toast.error('Error al añadir notas al grupo');
    }
  }, [markedNotes, handleAddNoteToGroup, setMarkedNotes, loadNotes]);

  // Remove marked notes from a group
  const handleRemoveNotesFromGroup = useCallback(async (groupId: string) => {
    try {
      const removePromises = markedNotes.map(noteId =>
        handleRemoveNoteFromGroup(groupId, noteId)
      );

      await Promise.all(removePromises);
      toast.success('Notas eliminadas del grupo exitosamente');
      setMarkedNotes([]);
      loadNotes();
    } catch (error) {
      console.error('Error removing notes from group:', error);
      toast.error('Error al eliminar notas del grupo');
    }
  }, [markedNotes, handleRemoveNoteFromGroup, setMarkedNotes, loadNotes]);

  return {
    editingGroup,
    setEditingGroup,
    handleEditGroup,
    handleSaveGroup,
    handleDeleteMarkedNotesWithClear,
    handleAddNotesToGroup,
    handleRemoveNotesFromGroup
  };
};

export default useGroupActions;
