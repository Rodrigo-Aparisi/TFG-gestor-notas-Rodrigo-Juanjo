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
    newUserGroup,
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
    setUserNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote,
    showFeedback
  } = useUserGroups();

  const [activeTab, setActiveTab] = useState<'notes' | 'members'>('notes');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  
  // Estados para los modales y campos de edición
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // Determinar si el usuario actual es propietario o administrador del grupo seleccionado
  const isOwnerOrAdmin = React.useMemo(() => {
    console.log("Evaluando isOwnerOrAdmin:");
    console.log("selectedGroup:", selectedGroup);
    console.log("user:", user);
    console.log("ID de usuario actual:", user?.id);

    if (!selectedGroup?.members || !user?.id) {
      console.log("No hay grupo seleccionado o usuario");
      return false;
    }
    
    // Buscar directamente al usuario en los miembros del grupo
    const userMember = selectedGroup.members.find(member => member.user_id === user.id);
    console.log("Usuario miembro encontrado:", userMember);
    
    if (userMember) {
      console.log(`Usuario es ${userMember.role}`);
      // El usuario es propietario o admin
      if (userMember.role === 'owner' || userMember.role === 'admin') {
        console.log("Usuario es propietario o admin - Tiene permisos");
        return true;
      }
    }
    
    console.log("Usuario no tiene permisos de propietario o admin");
    return false;
  }, [selectedGroup?.members, user?.id, forceRender]);

  // Forzar re-renderizado cuando cambia el grupo seleccionado
  useEffect(() => {
    setForceRender(prev => prev + 1);
    if (selectedGroup) {
      setNewGroupName(selectedGroup.name);
      setNewGroupDescription(selectedGroup.description || '');
    }
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
      // Obtener el user_id del miembro que se está editando
      const memberToEdit = selectedGroup.members.find(m => m.id === memberId);
      if (!memberToEdit) return;
      
      // Verificar si el usuario está intentando editar sus propios permisos
      if (memberToEdit.user_id === user?.id) {
        showFeedback('No puedes editar tus propios permisos');
        return;
      }
      
      const response = await api.put(`/user-groups/${selectedGroup.id}/members/${memberToEdit.user_id}/role`, { role: newRole });
      
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
    } catch (error: any) {
      console.error('Error al actualizar permisos:', error);
      
      // Verificar si el error es específicamente por intentar editar los propios permisos
      if (error.response?.data?.message?.includes('own permissions') || 
          error.response?.data?.error?.includes('own permissions')) {
        showFeedback('No puedes editar tus propios permisos');
      } else {
        showFeedback('Error al actualizar permisos');
      }
    }
  };

  // Función para manejar la edición del nombre del grupo
  const handleEditGroupName = (groupId: string) => {
    if (!selectedGroup) return;
    
    // Verificar si el usuario tiene permisos
    if (isOwnerOrAdmin) {
      setNewGroupName(selectedGroup.name);
      setShowRenameModal(true);
    } else {
      showFeedback('No tienes permisos para editar este grupo');
    }
  };

  // Función para manejar la edición de la descripción del grupo
  const handleEditGroupDescription = (groupId: string) => {
    if (!selectedGroup) return;
    
    // Verificar si el usuario tiene permisos
    if (isOwnerOrAdmin) {
      setNewGroupDescription(selectedGroup.description || '');
      setShowDescriptionModal(true);
    } else {
      showFeedback('No tienes permisos para editar este grupo');
    }
  };

  // Función para cambiar el nombre del grupo
  const handleRenameGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      // Validar que el nuevo nombre no esté vacío
      if (!newGroupName || newGroupName.trim() === '') {
        showFeedback('El nombre del grupo no puede estar vacío');
        return false;
      }
      
      // Llamada a la API para actualizar el nombre del grupo
      const response = await api.put(`/user-groups/${selectedGroup.id}/rename`, { 
        name: newGroupName 
      });
      
      if (response.status === 200 || response.data.success) {
        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);
        
        showFeedback('Nombre del grupo actualizado correctamente');
        setShowRenameModal(false);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Error al cambiar el nombre del grupo:', error);
      
      if (error.response?.status === 403) {
        showFeedback('No tienes permisos para cambiar el nombre del grupo');
      } else {
        showFeedback('Error al cambiar el nombre del grupo');
      }
      
      return false;
    }
  };

  // Función para cambiar la descripción del grupo
  const handleUpdateGroupDescription = async () => {
    if (!selectedGroup) return;
    
    try {
      // Llamada a la API para actualizar la descripción del grupo
      const response = await api.put(`/user-groups/${selectedGroup.id}/description`, { 
        description: newGroupDescription 
      });
      
      if (response.status === 200 || response.data.success) {
        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);
        
        showFeedback('Descripción del grupo actualizada correctamente');
        setShowDescriptionModal(false);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Error al cambiar la descripción del grupo:', error);
      
      if (error.response?.status === 403) {
        showFeedback('No tienes permisos para cambiar la descripción del grupo');
      } else {
        showFeedback('Error al cambiar la descripción del grupo');
      }
      
      return false;
    }
  };

  // Añadir un log para depuración antes de renderizar
  console.log("Antes de renderizar componentes:", {
    userId: user?.id,
    isOwnerOrAdmin,
    selectedGroup
  });

  return (
    <div className="groups-container">
      <UserGroupSidebar
        groups={userGroups || []}
        activeGroup={selectedGroup?.id || ''}
        onGroupSelect={selectGroup}
        onEditGroupName={handleEditGroupName}
        onEditGroupDescription={handleEditGroupDescription}
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
                  isOwnerOrAdmin={isOwnerOrAdmin}
                  onEditNote={handleEditNote}
                  onDeleteNote={handleDeleteNote}
                  handleTogglePin={handleTogglePinNote}
                />
              </>
            ) : (
              <GroupOfMembersList
                members={selectedGroup.members || []}
                currentUserId={user?.id || ''}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onRemoveMember={handleRemoveMember}
                onEditPermissions={handleEditPermissions}
              />
            )}
          </>
        ) : (
          <div className="no-group-selected">
            <h2>Selecciona un grupo o crea uno nuevo</h2>
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
          newUserGroup={newUserGroup}
          setUserNewGroup={setUserNewGroup}
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

      {/* Modal para cambiar el nombre del grupo */}
      {showRenameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Cambiar nombre del grupo</h2>
            <input 
              type="text" 
              value={newGroupName} 
              onChange={(e) => setNewGroupName(e.target.value)} 
              placeholder="Nuevo nombre del grupo"
              className="form-control"
            />
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowRenameModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleRenameGroup}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar la descripción del grupo */}
      {showDescriptionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Cambiar descripción del grupo</h2>
            <textarea 
              value={newGroupDescription} 
              onChange={(e) => setNewGroupDescription(e.target.value)} 
              placeholder="Nueva descripción del grupo"
              className="form-control"
              rows={4}
            />
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowDescriptionModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleUpdateGroupDescription}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;