import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const noteController = new NoteController();

router.use(authenticateToken);

router.get('/', noteController.getGroups);
router.post('/', noteController.createGroup);
router.delete('/:id', noteController.deleteGroup);

export default router;
