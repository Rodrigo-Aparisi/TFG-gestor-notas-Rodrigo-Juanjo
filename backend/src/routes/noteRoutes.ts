import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { handleMulterError } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas/note.schema';
import { asyncHandler } from '../middleware/errorHandler';


const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken);

// Rutas de notas
router.post('/', validate(createNoteSchema), asyncHandler(noteController.createNote.bind(noteController)));
router.get('/', asyncHandler(noteController.getNotes.bind(noteController)));
router.put('/:id', validate(updateNoteSchema), asyncHandler(noteController.updateNote.bind(noteController)));
router.post('/share', asyncHandler(noteController.shareNote.bind(noteController)));
router.get('/shared-notes', asyncHandler(noteController.getSharedNotes.bind(noteController)));
router.delete('/:id', asyncHandler(noteController.deleteNote.bind(noteController)));
router.patch('/:id/pin', asyncHandler(noteController.togglePin.bind(noteController)));
router.patch('/:id/mark', asyncHandler(noteController.toggleMark.bind(noteController)));
router.post('/unmark-all', asyncHandler(noteController.unmarkAllNotes.bind(noteController)));
router.get('/users', asyncHandler(noteController.searchUsers.bind(noteController)));

// Nuevas rutas para permisos de edición
router.put('/:id/share-permissions', asyncHandler(noteController.updateSharedNotePermissions.bind(noteController)));
router.put('/shared-notes/:id', asyncHandler(noteController.updateSharedNote.bind(noteController)));

//Rutas de la papelera
router.get('/trash', asyncHandler(noteController.getTrashNotes.bind(noteController)));
router.post('/trash/:id/restore', asyncHandler(noteController.restoreNote.bind(noteController)));
router.delete('/trash/empty', asyncHandler(noteController.emptyTrash.bind(noteController)));

// Rutas para preferencias de ordenación
router.get('/sort-preferences', asyncHandler(noteController.getUserSortPreferences.bind(noteController)));
router.post('/sort-preferences', asyncHandler(noteController.saveUserSortPreferences.bind(noteController)));
router.post('/upload-image', upload.single('image'), handleMulterError, asyncHandler(noteController.uploadNoteImage.bind(noteController)));

export default router;
