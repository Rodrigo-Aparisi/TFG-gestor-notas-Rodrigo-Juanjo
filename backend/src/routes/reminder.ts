import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken  } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken );

router.get('/reminders', reminderController.getReminders);
router.post('/reminders', reminderController.createReminder);
router.patch('/reminders/:id/status', reminderController.updateReminderStatus);
router.put('/reminders/:id', reminderController.updateReminder);
router.delete('/reminders/:id', reminderController.deleteReminder);

export default router;