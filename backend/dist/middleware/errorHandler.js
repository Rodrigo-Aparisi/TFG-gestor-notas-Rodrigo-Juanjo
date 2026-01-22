"use strict";
/**
 * Centralized Error Handler Middleware
 *
 * This middleware catches all errors and formats them consistently.
 * It should be the LAST middleware in the Express chain.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
const errors_1 = require("../errors");
const logger_1 = require("../config/logger");
/**
 * Determines if we're in production environment
 */
const isProduction = process.env.NODE_ENV === 'production';
/**
 * Handles known PostgreSQL errors
 */
function handleDatabaseError(error) {
    const dbErrorCodes = {
        '23505': { message: 'El registro ya existe', status: 409 }, // Unique violation
        '23503': { message: 'Referencia inválida', status: 400 }, // Foreign key violation
        '23502': { message: 'Campo requerido faltante', status: 400 }, // Not null violation
        '22P02': { message: 'Formato de datos inválido', status: 400 }, // Invalid text representation
        '42P01': { message: 'Tabla no encontrada', status: 500 }, // Undefined table
        '42703': { message: 'Columna no encontrada', status: 500 }, // Undefined column
    };
    const dbError = dbErrorCodes[error.code || ''];
    if (dbError) {
        return new errors_1.AppError(dbError.message, dbError.status, true, `DB_${error.code}`);
    }
    return new errors_1.AppError('Error de base de datos', 500, false, 'DATABASE_ERROR');
}
/**
 * Handles JWT errors
 */
function handleJWTError(error) {
    if (error.name === 'JsonWebTokenError') {
        return new errors_1.AppError('Token inválido', 401, true, 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
        return new errors_1.AppError('Token expirado', 401, true, 'TOKEN_EXPIRED');
    }
    return new errors_1.AppError('Error de autenticación', 401, true, 'AUTH_ERROR');
}
/**
 * Main error handler middleware
 */
function errorHandler(err, req, res, _next) {
    let error;
    // Convert known error types to AppError
    if ((0, errors_1.isAppError)(err)) {
        error = err;
    }
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        error = handleJWTError(err);
    }
    else if (err.code?.startsWith('2')) {
        // PostgreSQL error codes start with digits
        error = handleDatabaseError(err);
    }
    else {
        // Unknown error - wrap it
        error = new errors_1.AppError(isProduction ? 'Error interno del servidor' : err.message, 500, false);
    }
    // Log the error
    const logContext = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id,
        statusCode: error.statusCode,
        code: error.code,
        stack: error.stack,
    };
    if (error.statusCode >= 500) {
        logger_1.logger.error(error.message, logContext);
    }
    else if (error.statusCode >= 400) {
        logger_1.logger.warn(error.message, logContext);
    }
    // Build response
    const response = {
        success: false,
        error: {
            message: error.message,
            code: error.code,
        },
    };
    // Add validation errors if present
    if (error instanceof errors_1.ValidationError && error.errors) {
        response.error.errors = error.errors;
    }
    // Set retry-after header for rate limiting
    if (error instanceof errors_1.TooManyRequestsError && error.retryAfter) {
        res.setHeader('Retry-After', error.retryAfter);
    }
    // Send response
    res.status(error.statusCode).json(response);
}
/**
 * Async handler wrapper to catch async errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * 404 Not Found handler for unmatched routes
 */
function notFoundHandler(req, res, next) {
    const error = new errors_1.AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404, true, 'ROUTE_NOT_FOUND');
    next(error);
}
