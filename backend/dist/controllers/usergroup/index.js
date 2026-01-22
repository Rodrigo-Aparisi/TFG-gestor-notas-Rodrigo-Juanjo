"use strict";
/**
 * User Group Controllers - Split from original UserGroupController.ts (1,704 lines)
 *
 * Original file split into 3 focused controllers:
 * - UserGroupCrudController: Group CRUD operations (~350 lines)
 * - GroupMemberController: Member management, invitations, ownership (~430 lines)
 * - GroupNoteController: Group notes CRUD, images, pin (~370 lines)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserGroupController = exports.GroupNoteController = exports.GroupMemberController = exports.UserGroupCrudController = void 0;
var UserGroupCrudController_1 = require("./UserGroupCrudController");
Object.defineProperty(exports, "UserGroupCrudController", { enumerable: true, get: function () { return UserGroupCrudController_1.UserGroupCrudController; } });
var GroupMemberController_1 = require("./GroupMemberController");
Object.defineProperty(exports, "GroupMemberController", { enumerable: true, get: function () { return GroupMemberController_1.GroupMemberController; } });
var GroupNoteController_1 = require("./GroupNoteController");
Object.defineProperty(exports, "GroupNoteController", { enumerable: true, get: function () { return GroupNoteController_1.GroupNoteController; } });
// Create singleton instances for backward compatibility
const UserGroupCrudController_2 = require("./UserGroupCrudController");
const GroupMemberController_2 = require("./GroupMemberController");
const GroupNoteController_2 = require("./GroupNoteController");
const userGroupCrudController = new UserGroupCrudController_2.UserGroupCrudController();
const groupMemberController = new GroupMemberController_2.GroupMemberController();
const groupNoteController = new GroupNoteController_2.GroupNoteController();
/**
 * Unified UserGroupController class that delegates to specialized controllers
 * Maintains backward compatibility with existing routes
 */
class UserGroupController {
    constructor() {
        // Group CRUD Operations
        this.getUserGroups = userGroupCrudController.getUserGroups.bind(userGroupCrudController);
        this.createUserGroup = userGroupCrudController.createUserGroup.bind(userGroupCrudController);
        this.getUserGroup = userGroupCrudController.getUserGroup.bind(userGroupCrudController);
        this.updateUserGroup = userGroupCrudController.updateUserGroup.bind(userGroupCrudController);
        this.deleteUserGroup = userGroupCrudController.deleteUserGroup.bind(userGroupCrudController);
        this.renameUserGroup = userGroupCrudController.renameUserGroup.bind(userGroupCrudController);
        this.updateGroupDescription = userGroupCrudController.updateGroupDescription.bind(userGroupCrudController);
        // Member Management Operations
        this.getGroupMembers = groupMemberController.getGroupMembers.bind(groupMemberController);
        this.addGroupMember = groupMemberController.addGroupMember.bind(groupMemberController);
        this.removeGroupMember = groupMemberController.removeGroupMember.bind(groupMemberController);
        this.updateMemberRole = groupMemberController.updateMemberRole.bind(groupMemberController);
        this.inviteUserByEmail = groupMemberController.inviteUserByEmail.bind(groupMemberController);
        this.searchUsers = groupMemberController.searchUsers.bind(groupMemberController);
        this.leaveGroup = groupMemberController.leaveGroup.bind(groupMemberController);
        this.transferOwnership = groupMemberController.transferOwnership.bind(groupMemberController);
        // Group Notes Operations
        this.getGroupNotes = groupNoteController.getGroupNotes.bind(groupNoteController);
        this.createGroupNote = groupNoteController.createGroupNote.bind(groupNoteController);
        this.getGroupNote = groupNoteController.getGroupNote.bind(groupNoteController);
        this.updateGroupNote = groupNoteController.updateGroupNote.bind(groupNoteController);
        this.deleteGroupNote = groupNoteController.deleteGroupNote.bind(groupNoteController);
        this.togglePinGroupNote = groupNoteController.togglePinGroupNote.bind(groupNoteController);
        this.uploadGroupNoteImage = groupNoteController.uploadGroupNoteImage.bind(groupNoteController);
        this.deleteGroupNoteImage = groupNoteController.deleteGroupNoteImage.bind(groupNoteController);
    }
}
exports.UserGroupController = UserGroupController;
