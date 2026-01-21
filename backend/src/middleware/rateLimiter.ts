import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login endpoint
 * Prevents brute force attacks
 * 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Demasiados intentos de login desde esta IP, por favor intente de nuevo después de 15 minutos'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store in memory (for production, consider using Redis)
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * Rate limiter for password reset request endpoint
 * Prevents spam and DoS attacks
 * 3 attempts per 15 minutes per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    error: 'Demasiadas solicitudes de recuperación de contraseña desde esta IP, por favor intente de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for password reset confirmation endpoint
 * 3 attempts per 15 minutes per IP
 */
export const passwordResetConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    error: 'Demasiados intentos de cambio de contraseña desde esta IP, por favor intente de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Applied to all API routes
 * 100 requests per 15 minutes per IP
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for static files
  skip: (req) => {
    return req.path.startsWith('/uploads/');
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per 15 minutes per IP
 */
export const strictApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'Demasiadas solicitudes para esta operación, por favor intente de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for registration endpoint
 * Prevents automated account creation
 * 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: {
    error: 'Demasiados registros desde esta IP, por favor intente de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export all limiters
export default {
  loginLimiter,
  passwordResetLimiter,
  passwordResetConfirmLimiter,
  generalApiLimiter,
  strictApiLimiter,
  registerLimiter
};
