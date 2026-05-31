import express from 'express';
import { passwordController } from '../controllers/passwordController';
import { passwordResetLimiter, passwordResetConfirmLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { requestResetSchema, resetPasswordSchema } from '../validation/schemas/user.schema';

const router = express.Router();

// Ruta para solicitar recuperación de contraseña (con rate limiting y validación)
router.post('/request-reset', passwordResetLimiter, validate(requestResetSchema), passwordController.requestReset);

// Rate-limited to prevent silent enumeration of password reset tokens
router.get('/validate-token/:token', passwordResetLimiter, passwordController.validateToken);

// Ruta para cambiar contraseña con token (con rate limiting y validación robusta)
router.post('/reset', passwordResetConfirmLimiter, validate(resetPasswordSchema), passwordController.resetPassword);

export default router;
