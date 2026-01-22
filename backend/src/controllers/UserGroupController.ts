/**
 * User Group Controller - Re-export for backward compatibility
 *
 * The original UserGroupController.ts (1,704 lines) has been split into:
 * - controllers/usergroup/UserGroupCrudController.ts (~350 lines)
 * - controllers/usergroup/GroupMemberController.ts (~430 lines)
 * - controllers/usergroup/GroupNoteController.ts (~370 lines)
 *
 * This file maintains backward compatibility with existing imports.
 */

export {
  UserGroupController,
  UserGroupCrudController,
  GroupMemberController,
  GroupNoteController
} from './usergroup';
