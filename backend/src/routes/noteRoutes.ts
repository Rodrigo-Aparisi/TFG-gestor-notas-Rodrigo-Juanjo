import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { handleMulterError } from '../config/multerConfigNotes';


const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken);

// Rutas de notas
router.post('/', noteController.createNote);
router.get('/', noteController.getNotes);
router.put('/:id', noteController.updateNote);
router.post('/share', noteController.shareNote);
router.get('/shared-notes', noteController.getSharedNotes);
router.post('/upload-image', upload.single('image'), noteController.uploadNoteImage);
router.delete('/:id', noteController.deleteNote);
router.patch('/:id/pin', noteController.togglePin);
router.patch('/:id/mark', noteController.toggleMark);
router.post('/unmark-all', noteController.unmarkAllNotes);

// Nuevas rutas para permisos de edición
router.put('/:id/share-permissions', noteController.updateSharedNotePermissions);
router.put('/shared-notes/:id', authenticateToken, noteController.updateSharedNote);

// Rutas para preferencias de ordenación
router.get('/sort-preferences', noteController.getUserSortPreferences);
router.post('/sort-preferences', noteController.saveUserSortPreferences);

router.post(
    '/upload-image',
    authenticateToken,
    upload.single('image'),
    handleMulterError,
    noteController.uploadNoteImage
);

export default router;
