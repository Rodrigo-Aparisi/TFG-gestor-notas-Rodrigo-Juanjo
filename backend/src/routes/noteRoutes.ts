import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken);

// Rutas de notas
router.post('/', noteController.createNote);
router.get('/', noteController.getNotes);
router.put('/:id', noteController.updateNote);
router.post('/share', noteController.shareNote);
router.delete('/:id', noteController.deleteNote);
router.patch('/:id/pin', noteController.togglePin);
router.patch('/:id/mark', noteController.toggleMark);
router.post('/unmark-all', noteController.unmarkAllNotes);

export default router;
