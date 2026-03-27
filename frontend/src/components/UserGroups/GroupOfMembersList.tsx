import React, { useState, useEffect } from 'react';
import { GroupMember } from '../../types';
import { getFullImageUrl } from '../../utils/imageHelpers';

interface GroupOfMembersListProps {
  members: GroupMember[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onRemoveMember: (userId: string) => void;
  onEditPermissions: (memberId: string, newRole: string) => void;
}

const GroupOfMembersList: React.FC<GroupOfMembersListProps> = ({
  members,
  currentUserId,
  isOwnerOrAdmin,
  onRemoveMember,
  onEditPermissions
}) => {
  // Estado para controlar qué miembro está siendo editado
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  
  // Estado local para mantener la lista actualizada de miembros
  const [localMembers, setLocalMembers] = useState<GroupMember[]>([]);
  
  // Sincronizar el estado local con los props cuando estos cambien
  useEffect(() => {
    if (Array.isArray(members)) {
      setLocalMembers(members);
    }
  }, [members]);

  // Verificar si el usuario actual es propietario
  const isCurrentUserOwner = localMembers.some(
    member => member.user_id === currentUserId && member.role === 'owner'
  );
  
  // Manejar el cambio de rol
  const handleRoleChange = (memberId: string, newRole: string) => {
    // Actualizar el estado local primero
    setLocalMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );
    
    // Luego llamar a la función del prop
    onEditPermissions(memberId, newRole);
    setEditingMemberId(null);
  };
  
  // Manejar la eliminación de un miembro
  const handleRemoveMember = (userId: string) => {
    // Actualizar el estado local primero para reflejar el cambio inmediatamente
    setLocalMembers(prevMembers => 
      prevMembers.filter(member => member.user_id !== userId)
    );
    
    // Luego llamar a la función del prop
    onRemoveMember(userId);
  };
  
  // Verificar si se debe mostrar el botón de editar permisos para un miembro
  const shouldShowEditButton = (member: GroupMember) => {
    // Nunca mostrar el botón para el usuario actual
    if (member.user_id === currentUserId) return false;
    
    // No mostrar para propietarios
    if (member.role === 'owner') return false;
    
    // Si el usuario actual es propietario, mostrar para todos los demás
    if (isCurrentUserOwner) return true;
    
    // Si el usuario actual es admin, mostrar solo para miembros normales
    return isOwnerOrAdmin && member.role !== 'admin';
  };
  
  // Verificar si se debe mostrar el botón de eliminar para un miembro
  const shouldShowRemoveButton = (member: GroupMember) => {
    // No mostrar para propietarios
    if (member.role === 'owner') return false;
    
    // No mostrar para el usuario actual (usará el botón abandonar)
    if (member.user_id === currentUserId) return false;
    
    // Si el usuario actual es propietario, mostrar para todos
    if (isCurrentUserOwner) return true;
    
    // Si el usuario actual es admin, mostrar solo para miembros normales
    return isOwnerOrAdmin && member.role !== 'admin';
  };
  
  // Verificar si se debe mostrar el botón de abandonar grupo
  const shouldShowLeaveButton = (member: GroupMember) => {
    // Solo mostrar para el usuario actual si no es propietario
    return member.user_id === currentUserId && member.role !== 'owner';
  };

  return (
    <div className="group-members">
      <h2>Miembros del Grupo</h2>
      <div className="members-list">
        {localMembers.map(member => {
          // Determinar qué botones mostrar para este miembro
          const showEditButton = shouldShowEditButton(member);
          const showRemoveButton = shouldShowRemoveButton(member);
          const showLeaveButton = shouldShowLeaveButton(member);
          
          return (
            <div key={member.id} className="member-item">
              <div className="member-info">
                {member.profile_image ? (
                  <img
                    src={getFullImageUrl(member.profile_image)}
                    alt={member.username}
                    className="member-avatar"
                  />
                ) : (
                  <div className="member-avatar-placeholder">
                    {member.username && member.username[0] ? member.username[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h4>{member.username}</h4>
                  <span className={`member-role ${member.role}`}>
                    {member.role === 'owner' ? 'Propietario' : 
                     member.role === 'admin' ? 'Administrador' : 'Miembro'}
                  </span>
                </div>
              </div>

              <div className="member-actions" style={{ display: 'flex', gap: '8px' }}>
                {/* Mostrar el selector de roles solo si estamos editando este miembro */}
                {editingMemberId === member.id && showEditButton && (
                  <div className="role-selector" style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="member">Miembro</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <button 
                      className="cancel-edit-btn"
                      onClick={() => setEditingMemberId(null)}
                      style={{ padding: '6px 12px', backgroundColor: '#e0e0e0' }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Botón de Editar Permisos */}
                {editingMemberId !== member.id && showEditButton && (
                  <button
                    className="edit-permissions-btn"
                    onClick={() => setEditingMemberId(member.id)}
                    style={{ 
                      backgroundColor: '#2196f3', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    Editar Permisos
                  </button>
                )}

                {/* Botón de Eliminar */}
                {showRemoveButton && (
                  <button
                    className="remove-member-btn"
                    onClick={() => handleRemoveMember(member.user_id)}
                    style={{ 
                      backgroundColor: '#f44336', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    Eliminar
                  </button>
                )}
                
                {/* Botón de Abandonar Grupo */}
                {showLeaveButton && (
                  <button
                    className="leave-group-btn"
                    onClick={() => handleRemoveMember(member.user_id)}
                    style={{ 
                      backgroundColor: '#ff9800', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    Abandonar Grupo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupOfMembersList;
