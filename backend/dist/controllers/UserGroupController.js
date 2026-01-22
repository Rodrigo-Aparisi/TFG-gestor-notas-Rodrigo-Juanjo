"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupNoteController = exports.GroupMemberController = exports.UserGroupCrudController = exports.UserGroupController = void 0;
var usergroup_1 = require("./usergroup");
Object.defineProperty(exports, "UserGroupController", { enumerable: true, get: function () { return usergroup_1.UserGroupController; } });
Object.defineProperty(exports, "UserGroupCrudController", { enumerable: true, get: function () { return usergroup_1.UserGroupCrudController; } });
Object.defineProperty(exports, "GroupMemberController", { enumerable: true, get: function () { return usergroup_1.GroupMemberController; } });
Object.defineProperty(exports, "GroupNoteController", { enumerable: true, get: function () { return usergroup_1.GroupNoteController; } });
