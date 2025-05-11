// pages/Groups.tsx
import React, { useState } from 'react';
import '../styles/groups.css';
import { useAuth } from '../hooks/useAuth';
import { useUserGroups } from '../hooks/useUserGroups';
import { GroupNote } from '../types';
import UserGroupSidebar from '../components/UserGroups/UserGroupSidebar';
import GroupNotesGrid from '../components/UserGroups/GroupNotesGrid';
import GroupMembersList from '../components/UserGroups/GroupOfMembersList';
import CreateGroupModal from '../components/UserGroups/CreateGroupModal';
import AddMemberModal from '../components/UserGroups/AddMemberModal';
import CreateNoteModal from '../components/UserGroups/CreateNoteModal';
import EditNoteModal from '../components/UserGroups/EditNoteModal';
import GroupTabs from '../components/UserGroups/GroupTabs';

const Groups: React.FC = () => {
  const { user } = useAuth();
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
    setNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote
  } = useUserGroups();

  const [activeTab, setActiveTab] = useState<'notes' | 'members'>('notes');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);

  // Determinar si el usuario actual es propietario o administrador del grupo seleccionado
  const isOwnerOrAdmin = selectedGroup?.members?.some(
    member => member.user_id === user?.id && (member.role === 'owner' || member.role === 'admin')
  );

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
              
              {isOwnerOrAdmin && (
                <div className="group-actions">
                  <button 
                    className="add-member-btn"
                    onClick={() => setShowAddMemberModal(true)}
                  >
                    + Añadir Miembro
                  </button>
                  <button 
                    className="create-note-btn"
                    onClick={() => setShowCreateNoteModal(true)}
                  >
                    + Nueva Nota
                  </button>
                </div>
              )}
            </div>
            
            <GroupTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            
            {activeTab === 'notes' ? (
              <GroupNotesGrid
                notes={groupNotes || []}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                currentUserId={user?.id || ''}
                isOwnerOrAdmin={!!isOwnerOrAdmin}
              />
            ) : (
              <GroupMembersList
                members={selectedGroup.members || []}
                currentUserId={user?.id || ''}
                isOwnerOrAdmin={!!isOwnerOrAdmin}
                onRemoveMember={handleRemoveMember}
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
      
      {showCreateNoteModal && (
        <CreateNoteModal
          newNote={newNote}
          setNewNote={setNewNote}
          onClose={() => setShowCreateNoteModal(false)}
          onCreateNote={async () => {
            const success = await createGroupNote();
            if (success) {
              setShowCreateNoteModal(false);
            }
          }}
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