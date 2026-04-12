import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createReminderSchema, updateReminderSchema, updateReminderStatusSchema } from '../validation/schemas/reminder.schema';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

// Rutas para recordatorios
router.get('/', reminderController.getReminders);

router.post('/', validate(createReminderSchema), reminderController.createReminder);

// Ruta de búsqueda declarada ANTES de las rutas con parámetro dinámico /:id
// para que Express no interprete "search" como un id
router.get('/search', reminderController.searchReminders);

router.patch('/:id/status', validate(updateReminderStatusSchema), reminderController.updateReminderStatus);

router.put('/:id', validate(updateReminderSchema), reminderController.updateReminder);

router.delete('/:id', reminderController.deleteReminder);

export default router;
