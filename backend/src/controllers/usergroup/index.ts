/**
 * User Group Controllers - Split from original UserGroupController.ts (1,704 lines)
 *
 * Original file split into 3 focused controllers:
 * - UserGroupCrudController: Group CRUD operations (~350 lines)
 * - GroupMemberController: Member management, invitations, ownership (~430 lines)
 * - GroupNoteController: Group notes CRUD, images, pin (~370 lines)
 */

export { UserGroupCrudController } from './UserGroupCrudController';
export { GroupMemberController } from './GroupMemberController';
export { GroupNoteController } from './GroupNoteController';

// Create singleton instances for backward compatibility
import { UserGroupCrudController } from './UserGroupCrudController';
import { GroupMemberController } from './GroupMemberController';
import { GroupNoteController } from './GroupNoteController';

const userGroupCrudController = new UserGroupCrudController();
const groupMemberController = new GroupMemberController();
const groupNoteController = new GroupNoteController();

/**
 * Unified UserGroupController class that delegates to specialized controllers
 * Maintains backward compatibility with existing routes
 */
export class UserGroupController {
  // Group CRUD Operations
  getUserGroups = userGroupCrudController.getUserGroups.bind(userGroupCrudController);
  createUserGroup = userGroupCrudController.createUserGroup.bind(userGroupCrudController);
  getUserGroup = userGroupCrudController.getUserGroup.bind(userGroupCrudController);
  updateUserGroup = userGroupCrudController.updateUserGroup.bind(userGroupCrudController);
  deleteUserGroup = userGroupCrudController.deleteUserGroup.bind(userGroupCrudController);
  renameUserGroup = userGroupCrudController.renameUserGroup.bind(userGroupCrudController);
  updateGroupDescription = userGroupCrudController.updateGroupDescription.bind(userGroupCrudController);

  // Member Management Operations
  getGroupMembers = groupMemberController.getGroupMembers.bind(groupMemberController);
  addGroupMember = groupMemberController.addGroupMember.bind(groupMemberController);
  removeGroupMember = groupMemberController.removeGroupMember.bind(groupMemberController);
  updateMemberRole = groupMemberController.updateMemberRole.bind(groupMemberController);
  inviteUserByEmail = groupMemberController.inviteUserByEmail.bind(groupMemberController);
  searchUsers = groupMemberController.searchUsers.bind(groupMemberController);
  leaveGroup = groupMemberController.leaveGroup.bind(groupMemberController);
  transferOwnership = groupMemberController.transferOwnership.bind(groupMemberController);

  // Group Notes Operations
  getGroupNotes = groupNoteController.getGroupNotes.bind(groupNoteController);
  createGroupNote = groupNoteController.createGroupNote.bind(groupNoteController);
  getGroupNote = groupNoteController.getGroupNote.bind(groupNoteController);
  updateGroupNote = groupNoteController.updateGroupNote.bind(groupNoteController);
  deleteGroupNote = groupNoteController.deleteGroupNote.bind(groupNoteController);
  togglePinGroupNote = groupNoteController.togglePinGroupNote.bind(groupNoteController);
  uploadGroupNoteImage = groupNoteController.uploadGroupNoteImage.bind(groupNoteController);
  deleteGroupNoteImage = groupNoteController.deleteGroupNoteImage.bind(groupNoteController);
}
