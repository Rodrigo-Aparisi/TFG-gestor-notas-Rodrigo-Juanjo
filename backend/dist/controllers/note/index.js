"use strict";
/**
 * Note Controllers - Split from original noteController.ts (1,136 lines)
 *
 * Original file split into 3 focused controllers:
 * - NoteCrudController: CRUD, trash, images, pin/mark, preferences (~350 lines)
 * - NoteGroupController: Group management (~250 lines)
 * - NoteSharingController: Sharing and user search (~230 lines)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteController = exports.NoteSharingController = exports.NoteGroupController = exports.NoteCrudController = void 0;
var NoteCrudController_1 = require("./NoteCrudController");
Object.defineProperty(exports, "NoteCrudController", { enumerable: true, get: function () { return NoteCrudController_1.NoteCrudController; } });
var NoteGroupController_1 = require("./NoteGroupController");
Object.defineProperty(exports, "NoteGroupController", { enumerable: true, get: function () { return NoteGroupController_1.NoteGroupController; } });
var NoteSharingController_1 = require("./NoteSharingController");
Object.defineProperty(exports, "NoteSharingController", { enumerable: true, get: function () { return NoteSharingController_1.NoteSharingController; } });
// Create singleton instances for backward compatibility
const NoteCrudController_2 = require("./NoteCrudController");
const NoteGroupController_2 = require("./NoteGroupController");
const NoteSharingController_2 = require("./NoteSharingController");
const noteCrudController = new NoteCrudController_2.NoteCrudController();
const noteGroupController = new NoteGroupController_2.NoteGroupController();
const noteSharingController = new NoteSharingController_2.NoteSharingController();
/**
 * Unified NoteController class that delegates to specialized controllers
 * Maintains backward compatibility with existing routes
 */
class NoteController {
    constructor() {
        // CRUD Operations
        this.createNote = noteCrudController.createNote.bind(noteCrudController);
        this.getNotes = noteCrudController.getNotes.bind(noteCrudController);
        this.updateNote = noteCrudController.updateNote.bind(noteCrudController);
        this.deleteNote = noteCrudController.deleteNote.bind(noteCrudController);
        this.deleteMultipleNotes = noteCrudController.deleteMultipleNotes.bind(noteCrudController);
        // Trash Operations
        this.getTrashNotes = noteCrudController.getTrashNotes.bind(noteCrudController);
        this.restoreNote = noteCrudController.restoreNote.bind(noteCrudController);
        this.emptyTrash = noteCrudController.emptyTrash.bind(noteCrudController);
        // Image Operations
        this.uploadNoteImage = noteCrudController.uploadNoteImage.bind(noteCrudController);
        // Pin/Mark Operations
        this.togglePin = noteCrudController.togglePin.bind(noteCrudController);
        this.toggleMark = noteCrudController.toggleMark.bind(noteCrudController);
        this.unmarkAllNotes = noteCrudController.unmarkAllNotes.bind(noteCrudController);
        this.getMarkedNotes = noteCrudController.getMarkedNotes.bind(noteCrudController);
        // User Preferences
        this.getUserSortPreferences = noteCrudController.getUserSortPreferences.bind(noteCrudController);
        this.saveUserSortPreferences = noteCrudController.saveUserSortPreferences.bind(noteCrudController);
        // Internal Methods
        this.createNoteInternal = noteCrudController.createNoteInternal.bind(noteCrudController);
        // Group Operations
        this.createGroup = noteGroupController.createGroup.bind(noteGroupController);
        this.getGroups = noteGroupController.getGroups.bind(noteGroupController);
        this.updateGroup = noteGroupController.updateGroup.bind(noteGroupController);
        this.addNoteToGroup = noteGroupController.addNoteToGroup.bind(noteGroupController);
        this.removeNoteFromGroup = noteGroupController.removeNoteFromGroup.bind(noteGroupController);
        this.reorderGroups = noteGroupController.reorderGroups.bind(noteGroupController);
        this.deleteGroup = noteGroupController.deleteGroup.bind(noteGroupController);
        // Sharing Operations
        this.shareNote = noteSharingController.shareNote.bind(noteSharingController);
        this.getSharedNotes = noteSharingController.getSharedNotes.bind(noteSharingController);
        this.updateSharedNotePermissions = noteSharingController.updateSharedNotePermissions.bind(noteSharingController);
        this.updateSharedNote = noteSharingController.updateSharedNote.bind(noteSharingController);
        this.searchUsers = noteSharingController.searchUsers.bind(noteSharingController);
    }
}
exports.NoteController = NoteController;
