"use strict";
/**
 * Note Controller - Re-export for backward compatibility
 *
 * The original noteController.ts (1,136 lines) has been split into:
 * - controllers/note/NoteCrudController.ts (~350 lines)
 * - controllers/note/NoteGroupController.ts (~250 lines)
 * - controllers/note/NoteSharingController.ts (~230 lines)
 *
 * This file maintains backward compatibility with existing imports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteSharingController = exports.NoteGroupController = exports.NoteCrudController = exports.NoteController = void 0;
var note_1 = require("./note");
Object.defineProperty(exports, "NoteController", { enumerable: true, get: function () { return note_1.NoteController; } });
Object.defineProperty(exports, "NoteCrudController", { enumerable: true, get: function () { return note_1.NoteCrudController; } });
Object.defineProperty(exports, "NoteGroupController", { enumerable: true, get: function () { return note_1.NoteGroupController; } });
Object.defineProperty(exports, "NoteSharingController", { enumerable: true, get: function () { return note_1.NoteSharingController; } });
