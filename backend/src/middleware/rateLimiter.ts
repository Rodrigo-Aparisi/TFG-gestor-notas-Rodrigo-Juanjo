import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// En desarrollo se salta el rate limiting para no interferir con las pruebas
const skipInDevelopment = () => process.env.NODE_ENV !== 'production';

/**
 * Rate limiter for login endpoint
 * Prevents brute force attacks
 * 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error:
      'Demasiados intentos de login desde esta IP, por favor intente de nuevo después de 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
});

/**
 * Rate limiter for password reset request endpoint
 * Prevents spam and DoS attacks
 * 3 attempts per 15 minutes per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    error:
      'Demasiadas solicitudes de recuperación de contraseña desde esta IP, por favor intente de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
});

/**
 * Rate limiter for password reset confirmation endpoint
 * 3 attempts per 15 minutes per IP
 */
export const passwordResetConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    error:
      'Demasiados intentos de cambio de contraseña desde esta IP, por favor intente de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
});

/**
 * General API rate limiter
 * Applied to all API routes
 * 100 requests per 15 minutes per IP
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    if (process.env.NODE_ENV !== 'production') return true;
    return req.path.startsWith('/uploads/');
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per 15 minutes per IP
 */
export const strictApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Demasiadas solicitudes para esta operación, por favor intente de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
});

/**
 * Rate limiter for contact form endpoint
 * Prevents email service abuse
 * 5 submissions per hour per IP
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: 'Demasiados mensajes enviados desde esta IP, por favor intente de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
});

/**
 * Rate limiter for registration endpoint
 * Prevents automated account creation
 * 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: 'Demasiados registros desde esta IP, por favor intente de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
});

/**
 * Rate limiter for static uploads directory — prevents DoS via mass download.
 * 300 requests per 15 minutes per IP. Skipped in development.
 */
export const uploadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas solicitudes de archivos desde esta IP' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV !== 'production',
});

// Export all limiters
export default {
  loginLimiter,
  passwordResetLimiter,
  passwordResetConfirmLimiter,
  generalApiLimiter,
  strictApiLimiter,
  registerLimiter,
  contactLimiter,
  uploadsLimiter,
};
