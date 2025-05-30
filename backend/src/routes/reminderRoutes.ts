import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

// Middleware para logging de requests (ayuda en debugging)
router.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

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

router.get('/search', async (req, res, next) => {
  try {
    await reminderController.searchReminders(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
