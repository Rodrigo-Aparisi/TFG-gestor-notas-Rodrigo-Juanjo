import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

// Rutas para recordatorios
router.get('/', async (req, res, next) => {
  try {
    await reminderController.getReminders(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    await reminderController.createReminder(req, res);
  } catch (error) {
    next(error);
  }
});

// Ruta de búsqueda declarada ANTES de las rutas con parámetro dinámico /:id
// para que Express no interprete "search" como un id
router.get('/search', async (req, res, next) => {
  try {
    await reminderController.searchReminders(req, res);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    await reminderController.updateReminderStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    await reminderController.updateReminder(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await reminderController.deleteReminder(req, res);
  } catch (error) {
    next(error);
  }
});

// Middleware de manejo de errores
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error en rutas de recordatorios:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: error.message
  });
});

export default router;
