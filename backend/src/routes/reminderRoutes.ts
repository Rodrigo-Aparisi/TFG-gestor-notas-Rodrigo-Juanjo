import express from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticateToken } from '../middleware/auth';
import { emailService } from '../services/emailService';

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


router.post('/test-email', async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    const testDate = new Date();
    testDate.setHours(testDate.getHours() + 1); // Una hora en el futuro

    const result = await emailService.sendReminderEmail(
      req.user.id,
      'Recordatorio de prueba',
      'Este es un correo de prueba para verificar que el sistema funciona correctamente.',
      testDate
    );

    if (result) {
      res.json({ success: true, message: 'Correo de prueba enviado correctamente' });
    } else {
      res.status(500).json({ success: false, message: 'Error al enviar correo de prueba' });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
