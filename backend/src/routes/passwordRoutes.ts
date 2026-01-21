import express from 'express';
import { passwordController } from '../controllers/passwordController';
import { passwordResetLimiter, passwordResetConfirmLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { requestResetSchema, resetPasswordSchema } from '../validation/schemas/user.schema';

const router = express.Router();

// Ruta para solicitar recuperación de contraseña (con rate limiting y validación)
router.post('/request-reset', passwordResetLimiter, validate(requestResetSchema), passwordController.requestReset);

// Ruta para validar token (sin rate limiting excesivo)
router.get('/validate-token/:token', passwordController.validateToken);

// Ruta para cambiar contraseña con token (con rate limiting y validación robusta)
router.post('/reset', passwordResetConfirmLimiter, validate(resetPasswordSchema), passwordController.resetPassword);

export default router;
