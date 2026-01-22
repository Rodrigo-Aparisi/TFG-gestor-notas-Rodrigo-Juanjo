/**
 * Note Controllers - Split from original noteController.ts (1,136 lines)
 *
 * Original file split into 3 focused controllers:
 * - NoteCrudController: CRUD, trash, images, pin/mark, preferences (~350 lines)
 * - NoteGroupController: Group management (~250 lines)
 * - NoteSharingController: Sharing and user search (~230 lines)
 */

export { NoteCrudController } from './NoteCrudController';
export { NoteGroupController } from './NoteGroupController';
export { NoteSharingController } from './NoteSharingController';

// Create singleton instances for backward compatibility
import { NoteCrudController } from './NoteCrudController';
import { NoteGroupController } from './NoteGroupController';
import { NoteSharingController } from './NoteSharingController';

const noteCrudController = new NoteCrudController();
const noteGroupController = new NoteGroupController();
const noteSharingController = new NoteSharingController();

/**
 * Unified NoteController class that delegates to specialized controllers
 * Maintains backward compatibility with existing routes
 */
export class NoteController {
  // CRUD Operations
  createNote = noteCrudController.createNote.bind(noteCrudController);
  getNotes = noteCrudController.getNotes.bind(noteCrudController);
  updateNote = noteCrudController.updateNote.bind(noteCrudController);
  deleteNote = noteCrudController.deleteNote.bind(noteCrudController);
  deleteMultipleNotes = noteCrudController.deleteMultipleNotes.bind(noteCrudController);

  // Trash Operations
  getTrashNotes = noteCrudController.getTrashNotes.bind(noteCrudController);
  restoreNote = noteCrudController.restoreNote.bind(noteCrudController);
  emptyTrash = noteCrudController.emptyTrash.bind(noteCrudController);

  // Image Operations
  uploadNoteImage = noteCrudController.uploadNoteImage.bind(noteCrudController);

  // Pin/Mark Operations
  togglePin = noteCrudController.togglePin.bind(noteCrudController);
  toggleMark = noteCrudController.toggleMark.bind(noteCrudController);
  unmarkAllNotes = noteCrudController.unmarkAllNotes.bind(noteCrudController);
  getMarkedNotes = noteCrudController.getMarkedNotes.bind(noteCrudController);

  // User Preferences
  getUserSortPreferences = noteCrudController.getUserSortPreferences.bind(noteCrudController);
  saveUserSortPreferences = noteCrudController.saveUserSortPreferences.bind(noteCrudController);

  // Internal Methods
  createNoteInternal = noteCrudController.createNoteInternal.bind(noteCrudController);

  // Group Operations
  createGroup = noteGroupController.createGroup.bind(noteGroupController);
  getGroups = noteGroupController.getGroups.bind(noteGroupController);
  updateGroup = noteGroupController.updateGroup.bind(noteGroupController);
  addNoteToGroup = noteGroupController.addNoteToGroup.bind(noteGroupController);
  removeNoteFromGroup = noteGroupController.removeNoteFromGroup.bind(noteGroupController);
  reorderGroups = noteGroupController.reorderGroups.bind(noteGroupController);
  deleteGroup = noteGroupController.deleteGroup.bind(noteGroupController);

  // Sharing Operations
  shareNote = noteSharingController.shareNote.bind(noteSharingController);
  getSharedNotes = noteSharingController.getSharedNotes.bind(noteSharingController);
  updateSharedNotePermissions = noteSharingController.updateSharedNotePermissions.bind(noteSharingController);
  updateSharedNote = noteSharingController.updateSharedNote.bind(noteSharingController);
  searchUsers = noteSharingController.searchUsers.bind(noteSharingController);
}
