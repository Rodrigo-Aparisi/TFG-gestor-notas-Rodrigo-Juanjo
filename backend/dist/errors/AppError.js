"use strict";
/**
 * Custom Error Classes for Centralized Error Handling
 *
 * These classes provide structured error handling throughout the application.
 * Each error type has a specific HTTP status code and can carry additional context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.ServiceUnavailableError = exports.InternalError = exports.TooManyRequestsError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
exports.isAppError = isAppError;
exports.wrapError = wrapError;
/**
 * Base application error class
 * All custom errors should extend this class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
        // Set the prototype explicitly for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/**
 * 400 Bad Request - Invalid input or request
 */
class BadRequestError extends AppError {
    constructor(message = 'Solicitud inválida', code) {
        super(message, 400, true, code);
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}
exports.BadRequestError = BadRequestError;
/**
 * 401 Unauthorized - Authentication required
 */
class UnauthorizedError extends AppError {
    constructor(message = 'No autorizado', code) {
        super(message, 401, true, code);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * 403 Forbidden - Authenticated but not allowed
 */
class ForbiddenError extends AppError {
    constructor(message = 'Acceso denegado', code) {
        super(message, 403, true, code);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * 404 Not Found - Resource doesn't exist
 */
class NotFoundError extends AppError {
    constructor(message = 'Recurso no encontrado', code) {
        super(message, 404, true, code);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * 409 Conflict - Resource already exists or state conflict
 */
class ConflictError extends AppError {
    constructor(message = 'El recurso ya existe', code) {
        super(message, 409, true, code);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
exports.ConflictError = ConflictError;
/**
 * 422 Unprocessable Entity - Validation failed
 */
class ValidationError extends AppError {
    constructor(message = 'Error de validación', errors, code) {
        super(message, 422, true, code);
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
/**
 * 429 Too Many Requests - Rate limit exceeded
 */
class TooManyRequestsError extends AppError {
    constructor(message = 'Demasiadas solicitudes, intenta más tarde', retryAfter, code) {
        super(message, 429, true, code);
        this.retryAfter = retryAfter;
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
/**
 * 500 Internal Server Error - Unexpected error
 */
class InternalError extends AppError {
    constructor(message = 'Error interno del servidor', code) {
        super(message, 500, false, code);
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}
exports.InternalError = InternalError;
/**
 * 503 Service Unavailable - External service down
 */
class ServiceUnavailableError extends AppError {
    constructor(message = 'Servicio no disponible', code) {
        super(message, 503, true, code);
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Database error wrapper
 */
class DatabaseError extends AppError {
    constructor(message = 'Error de base de datos', code) {
        super(message, 500, false, code);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Type guard to check if an error is an AppError
 */
function isAppError(error) {
    return error instanceof AppError;
}
/**
 * Utility to wrap unknown errors into AppError
 */
function wrapError(error) {
    if (isAppError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new InternalError(error.message);
    }
    return new InternalError('Error desconocido');
}
