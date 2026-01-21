"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLimiter = exports.strictApiLimiter = exports.generalApiLimiter = exports.passwordResetConfirmLimiter = exports.passwordResetLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Rate limiter for login endpoint
 * Prevents brute force attacks
 * 5 attempts per 15 minutes per IP
 */
exports.loginLimiter = (0, express_rate_limit_1.default)({
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
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
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
exports.passwordResetConfirmLimiter = (0, express_rate_limit_1.default)({
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
exports.generalApiLimiter = (0, express_rate_limit_1.default)({
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
exports.strictApiLimiter = (0, express_rate_limit_1.default)({
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
exports.registerLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registrations per hour
    message: {
        error: 'Demasiados registros desde esta IP, por favor intente de nuevo más tarde'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Export all limiters
exports.default = {
    loginLimiter: exports.loginLimiter,
    passwordResetLimiter: exports.passwordResetLimiter,
    passwordResetConfirmLimiter: exports.passwordResetConfirmLimiter,
    generalApiLimiter: exports.generalApiLimiter,
    strictApiLimiter: exports.strictApiLimiter,
    registerLimiter: exports.registerLimiter
};
