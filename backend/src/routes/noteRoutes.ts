import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { handleMulterError } from '../config/multerConfigNotes';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas/note.schema';


const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken);

// Rutas de notas
router.post('/', validate(createNoteSchema), noteController.createNote);
router.get('/', noteController.getNotes);
router.put('/:id', validate(updateNoteSchema), noteController.updateNote);
router.post('/share', noteController.shareNote);
router.get('/shared-notes', noteController.getSharedNotes);
router.delete('/:id', noteController.deleteNote);
router.patch('/:id/pin', noteController.togglePin);
router.patch('/:id/mark', noteController.toggleMark);
router.post('/unmark-all', noteController.unmarkAllNotes);
router.get('/users', noteController.searchUsers);

// Nuevas rutas para permisos de edición
router.put('/:id/share-permissions', noteController.updateSharedNotePermissions);
router.put('/shared-notes/:id', noteController.updateSharedNote);

//Rutas de la papelera
router.get('/trash', noteController.getTrashNotes);
router.post('/trash/:id/restore', noteController.restoreNote);
router.delete('/trash/empty', noteController.emptyTrash);

// Rutas para preferencias de ordenación
router.get('/sort-preferences', noteController.getUserSortPreferences);
router.post('/sort-preferences', noteController.saveUserSortPreferences);
router.post('/upload-image', upload.single('image'), handleMulterError, noteController.uploadNoteImage);

export default router;
