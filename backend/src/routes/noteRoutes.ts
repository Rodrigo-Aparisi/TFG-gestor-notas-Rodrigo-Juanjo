import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken); // Proteger todas las rutas

router.post('/',  noteController.createNote);
router.get('/', noteController.getNotes);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

router.patch('/:id/pin', noteController.togglePin);
router.patch('/:id/mark', noteController.toggleMark);

export default router;