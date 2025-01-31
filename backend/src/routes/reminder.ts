import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken  } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken );

router.get('/', reminderController.getReminders);
router.post('/', reminderController.createReminder);
router.put('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

export default router;
