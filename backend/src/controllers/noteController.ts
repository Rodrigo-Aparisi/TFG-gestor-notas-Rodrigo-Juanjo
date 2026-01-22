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

export {
  NoteController,
  NoteCrudController,
  NoteGroupController,
  NoteSharingController
} from './note';
