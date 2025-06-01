import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { UserGroupController } from '../controllers/UserGroupController';

const router = express.Router();
const noteController = new NoteController();
const userGroupController = new UserGroupController();

router.use(authenticateToken);

// Rutas específicas primero
router.put('/reorder', noteController.reorderGroups);
router.post('/add-note', noteController.addNoteToGroup);

// Rutas básicas de grupos después
router.get('/', noteController.getGroups);
router.post('/', noteController.createGroup);
router.put('/:id', noteController.updateGroup);
router.delete('/:id', noteController.deleteGroup);
router.post('/notes/upload-image', upload.single('image'), userGroupController.uploadGroupNoteImage);
router.delete('/notes/:noteId/images/:imageIndex', userGroupController.deleteGroupNoteImage);

// Rutas para gestionar notas dentro de grupos
router.delete('/:groupId/notes/:noteId', noteController.removeNoteFromGroup);

export default router;
