import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createReminderSchema, updateReminderSchema, updateReminderStatusSchema } from '../validation/schemas/reminder.schema';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

// Rutas para recordatorios
router.get('/', asyncHandler(reminderController.getReminders.bind(reminderController)));

router.post('/', validate(createReminderSchema), asyncHandler(reminderController.createReminder.bind(reminderController)));

// Ruta de búsqueda declarada ANTES de las rutas con parámetro dinámico /:id
// para que Express no interprete "search" como un id
router.get('/search', asyncHandler(reminderController.searchReminders.bind(reminderController)));

router.patch('/:id/status', validate(updateReminderStatusSchema), asyncHandler(reminderController.updateReminderStatus.bind(reminderController)));

router.put('/:id', validate(updateReminderSchema), asyncHandler(reminderController.updateReminder.bind(reminderController)));

router.delete('/:id', asyncHandler(reminderController.deleteReminder.bind(reminderController)));

export default router;
