import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken);

// Rutas específicas primero
router.put('/reorder', noteController.reorderGroups);
router.post('/add-note', noteController.addNoteToGroup);

// Rutas básicas de grupos después
router.get('/', noteController.getGroups);
router.post('/', noteController.createGroup);
router.put('/:id', noteController.updateGroup);
router.delete('/:id', noteController.deleteGroup);

// Rutas para gestionar notas dentro de grupos
router.delete('/:groupId/notes/:noteId', noteController.removeNoteFromGroup);

export default router;
