import express from 'express';
import { passwordController } from '../controllers/passwordController';
import { passwordResetLimiter, passwordResetConfirmLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Ruta para solicitar recuperación de contraseña (con rate limiting)
router.post('/request-reset', passwordResetLimiter, passwordController.requestReset);

// Ruta para validar token (sin rate limiting excesivo)
router.get('/validate-token/:token', passwordController.validateToken);

// Ruta para cambiar contraseña con token (con rate limiting)
router.post('/reset', passwordResetConfirmLimiter, passwordController.resetPassword);

export default router;
