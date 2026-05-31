import express from 'express';
import { passwordController } from '../controllers/passwordController';
import { passwordResetLimiter, passwordResetConfirmLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { requestResetSchema, resetPasswordSchema } from '../validation/schemas/user.schema';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Ruta para solicitar recuperación de contraseña (con rate limiting y validación)
router.post(
  '/request-reset',
  passwordResetLimiter,
  validate(requestResetSchema),
  asyncHandler(passwordController.requestReset.bind(passwordController))
);

// Rate-limited to prevent silent enumeration of password reset tokens
router.get(
  '/validate-token/:token',
  passwordResetLimiter,
  asyncHandler(passwordController.validateToken.bind(passwordController))
);

// Ruta para cambiar contraseña con token (con rate limiting y validación robusta)
router.post(
  '/reset',
  passwordResetConfirmLimiter,
  validate(resetPasswordSchema),
  asyncHandler(passwordController.resetPassword.bind(passwordController))
);

export default router;
