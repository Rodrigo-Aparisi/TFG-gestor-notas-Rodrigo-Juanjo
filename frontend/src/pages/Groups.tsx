import React, { useState, useCallback, useEffect } from 'react';
import '../styles/groups.css';
import { useAuth } from '../hooks/useAuth';
import { useUserGroups } from '../hooks/useUserGroups';
import { GroupNote } from '../types';
import UserGroupSidebar from '../components/UserGroups/UserGroupSidebar';
import NotesGroups from '../components/UserGroups/GroupNotes';
import GroupOfMembersList from '../components/UserGroups/GroupOfMembersList';
import CreateGroupModal from '../components/UserGroups/CreateGroupModal';
import AddMemberModal from '../components/UserGroups/AddMemberModal';
import CreateGroupNoteForm from '../components/UserGroups/CreateGroupNoteForm';
import EditNoteModal from '../components/UserGroups/EditNoteModal';
import GroupTabs from '../components/UserGroups/GroupTabs';
import { useTextareaResize } from '../hooks/useTextareaResize';
import api from '../services/api';

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { autoResizeTextarea } = useTextareaResize();
  const {
    userGroups = [],
    selectedGroup,
    groupNotes = [],
    loading,
    feedback,
    newGroup,
    showCreateGroupModal,
    showAddMemberModal,
    newNote,
    editingNote,
    createGroup,
    addGroupMember,
    removeGroupMember,
    createGroupNote,
    updateGroupNote,
    handleNoteChange,
    deleteGroupNote,
    selectGroup,
    togglePinGroupNote,
    setNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote,
    showFeedback
  } = useUserGroups();

  const [activeTab, setActiveTab] = useState<'notes' | 'members'>('notes');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0); // Estado para forzar re-renderizado

  // Determinar si el usuario actual es propietario o administrador del grupo seleccionado
  const isOwnerOrAdmin = React.useMemo(() => {
    console.log("Evaluando isOwnerOrAdmin:");
    console.log("selectedGroup:", selectedGroup);
    console.log("user:", user);

    if (!selectedGroup?.members || !user?.id) {
      console.log("No hay grupo seleccionado o usuario");
      return false;
    }
    
    const result = selectedGroup.members.some(member => {
      console.log("Evaluando miembro:", member);
      console.log("user_id coincide:", member.user_id === user.id);
      console.log("role:", member.role);
      return member.user_id === user.id && (member.role === 'owner' || member.role === 'admin');
    });
    
    console.log("Resultado isOwnerOrAdmin:", result);
    return result || true; // Forzar a true temporalmente para depuración
  }, [selectedGroup?.members, user?.id, forceRender]);

  // Forzar re-renderizado cuando cambia el grupo seleccionado
  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [selectedGroup]);

  const handleEditNote = (note: GroupNote) => {
    setEditingNoteId(note.id);
    setEditingNote({ [note.id]: note });
  };

  const handleUpdateNoteSubmit = async () => {
    if (!editingNoteId) return;
    const success = await updateGroupNote(editingNoteId);
    if (success) {
      setEditingNoteId(null);
    }
  };

  const handleAddMember = async (username: string) => {
    if (!selectedGroup) return;
    const success = await addGroupMember({
      groupId: selectedGroup.id,
      username
    });
    if (success) {
      setShowAddMemberModal(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar a este miembro del grupo?')) {
      await removeGroupMember(selectedGroup.id, userId);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
      await deleteGroupNote(noteId);
    }
  };

  const handleTogglePinNote = async (noteId: string) => {
    if (selectedGroup) {
      await togglePinGroupNote(selectedGroup.id, noteId);
    }
  };

  const handleGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await api.post('/user-groups/notes/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.data && response.data.data.imageUrl) {
        setNewNote(prev => ({
          ...prev,
          images: [...(prev.images || []), response.data.data.imageUrl]
        }));
        showFeedback('Imagen subida correctamente');
      }
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      showFeedback('Error al subir la imagen');
    }
  };

  const handleEditPermissions = async (memberId: string, newRole: string) => {
    if (!selectedGroup) return;
    
    try {
      const memberUserId = selectedGroup.members.find(m => m.id === memberId)?.user_id;
      if (!memberUserId) return;
      
      const response = await api.put(`/user-groups/${selectedGroup.id}/members/${memberUserId}/role`, { role: newRole });
      
      if (response.status === 200 || response.data.success) {
        // Actualizar el grupo seleccionado con el nuevo rol
        const updatedMembers = selectedGroup.members.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        );
        
        // Actualizar el grupo en useUserGroups
        const updatedGroup = { ...selectedGroup, members: updatedMembers };
        selectGroup(selectedGroup.id); // Recargar el grupo para obtener los datos actualizados
        
        showFeedback('Permisos actualizados correctamente');
      }
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      showFeedback('Error al actualizar permisos');
    }
  };

  return (
    <div className="groups-container">
      <UserGroupSidebar
        groups={userGroups || []}
        selectedGroup={selectedGroup}
        onGroupSelect={selectGroup}
        onCreateGroup={() => setShowCreateGroupModal(true)}
      />

      <div className="group-content">
        {loading && <div className="loading-indicator">Cargando...</div>}
        {feedback && <div className="feedback-message">{feedback}</div>}

        {selectedGroup ? (
          <>
            <div className="group-header">
              <div>
                <h1>{selectedGroup.name}</h1>
                {selectedGroup.description && <p>{selectedGroup.description}</p>}
              </div>
              
              {/* Forzar visualización del botón para depuración */}
              <div className="group-actions" style={{ display: 'flex' }}>
                <button 
                  className="add-member-btn"
                  onClick={() => setShowAddMemberModal(true)}
                  style={{ display: 'block' }}
                >
                  + Añadir Miembro
                </button>
              </div>
            </div>
            
            <GroupTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            
            {activeTab === 'notes' ? (
              <>
                {/* Forzar visualización del formulario para depuración */}
                <div style={{ marginBottom: '20px' }}>
                  <CreateGroupNoteForm
                    newNote={newNote}
                    isLoading={loading}
                    setNewNote={setNewNote}
                    handleCreateNote={createGroupNote}
                    handleImageUpload={handleGroupImageUpload}
                    autoResizeTextarea={autoResizeTextarea}
                  />
                </div>
                
                <NotesGroups
                  notes={groupNotes || []}
                  currentUserId={user?.id || ''}
                  isOwnerOrAdmin={true} // Forzar a true para depuración
                  onEditNote={handleEditNote}
                  onDeleteNote={handleDeleteNote}
                  handleTogglePin={handleTogglePinNote}
                />
              </>
            ) : (
              <GroupOfMembersList
                members={selectedGroup.members || []}
                currentUserId={user?.id || ''}
                isOwnerOrAdmin={true} // Forzar a true para depuración
                onRemoveMember={handleRemoveMember}
                onEditPermissions={handleEditPermissions}
              />
            )}
          </>
        ) : (
          <div className="no-group-selected">
            <h2>Selecciona un grupo o crea uno nuevo</h2>
            <p>Los grupos te permiten compartir notas con otros usuarios</p>
            <button 
              className="create-group-btn large"
              onClick={() => setShowCreateGroupModal(true)}
            >
              + Crear Nuevo Grupo
            </button>
          </div>
        )}
      </div>
      
      {/* Modales */}
      {showCreateGroupModal && (
        <CreateGroupModal
          newGroup={newGroup}
          setNewGroup={setNewGroup}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={createGroup}
        />
      )}
      
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          onAddMember={handleAddMember}
        />
      )}
      
      {editingNoteId && editingNote[editingNoteId] && (
        <EditNoteModal
          note={editingNote[editingNoteId]}
          onClose={() => setEditingNoteId(null)}
          onUpdateNote={handleUpdateNoteSubmit}
          onNoteChange={(field, value) => handleNoteChange(editingNoteId, field, value)}
        />
      )}
    </div>
  );
};

export default Groups;