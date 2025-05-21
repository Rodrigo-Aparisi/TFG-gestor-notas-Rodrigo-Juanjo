import React, { useState } from 'react';
import { GroupMember } from '../../types';

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
  
  // Asegurar que members es un array
  const safeMembers = Array.isArray(members) ? members : [];
  
  console.log("GroupOfMembersList props detalladas:", {
    members: safeMembers,
    currentUserId,
    isOwnerOrAdmin,
    currentUserInMembers: safeMembers.find(m => m.user_id === currentUserId)
  });
  
  // Manejar el cambio de rol
  const handleRoleChange = (memberId: string, newRole: string) => {
    console.log(`Cambiando rol de ${memberId} a ${newRole}`);
    onEditPermissions(memberId, newRole);
    setEditingMemberId(null);
  };

  return (
    <div className="group-members">
      <h2>Miembros del Grupo</h2>
      <div className="members-list">
        {safeMembers.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              {member.profile_image ? (
                <img
                  src={member.profile_image}
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
              {editingMemberId === member.id && member.role !== 'owner' && (
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

              {/* Mostrar el botón de editar permisos solo si el usuario es el propietario o administrador */}
              {editingMemberId !== member.id && 
              member.role !== 'owner' && 
              isOwnerOrAdmin && (
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

              {/* Botón para eliminar miembro, no permitir eliminar al propietario */}
              {member.user_id !== currentUserId && member.role !== 'owner' && (
                <button
                  className="remove-member-btn"
                  onClick={() => onRemoveMember(member.user_id)}
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
              
              {/* Botón para abandonar el grupo si es el usuario actual y no es propietario */}
              {member.user_id === currentUserId && member.role !== 'owner' && (
                <button
                  className="leave-group-btn"
                  onClick={() => onRemoveMember(member.user_id)}
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
        ))}
      </div>
    </div>
  );
};

export default GroupOfMembersList;