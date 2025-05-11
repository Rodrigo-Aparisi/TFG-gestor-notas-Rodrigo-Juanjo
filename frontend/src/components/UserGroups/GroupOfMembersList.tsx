import React from 'react';
import { GroupMember } from '../../types';

interface GroupMembersListProps {
  members: GroupMember[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onRemoveMember: (userId: string) => void;
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({
  members,
  currentUserId,
  isOwnerOrAdmin,
  onRemoveMember
}) => {
  return (
    <div className="group-members">
      <h2>Miembros del Grupo</h2>
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              {member.profile_image ? (
                <img src={member.profile_image} alt={member.username} className="member-avatar" />
              ) : (
                <div className="member-avatar-placeholder">{member.username[0].toUpperCase()}</div>
              )}
              <div>
                <h4>{member.username}</h4>
                <span className={`member-role ${member.role}`}>{member.role}</span>
              </div>
            </div>
            
            {isOwnerOrAdmin && member.user_id !== currentUserId && (
              <button
                className="remove-member-btn"
                onClick={() => onRemoveMember(member.user_id)}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupMembersList;