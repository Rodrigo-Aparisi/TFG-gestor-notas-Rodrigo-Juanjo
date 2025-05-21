import express from 'express';
import { emailController } from '../controllers/emailController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

// Ruta para enviar un email de prueba
router.post('/test', emailController.sendTestEmail);

// Ruta para verificar recordatorios pendientes (solo admin)
router.post('/check-reminders', emailController.checkReminders);

export default router;
