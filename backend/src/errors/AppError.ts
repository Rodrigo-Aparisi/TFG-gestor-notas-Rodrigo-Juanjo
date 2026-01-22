/**
 * Custom Error Classes for Centralized Error Handling
 *
 * These classes provide structured error handling throughout the application.
 * Each error type has a specific HTTP status code and can carry additional context.
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
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

/**
 * 400 Bad Request - Invalid input or request
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Solicitud inválida', code?: string) {
    super(message, 400, true, code);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado', code?: string) {
    super(message, 401, true, code);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Authenticated but not allowed
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado', code?: string) {
    super(message, 403, true, code);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado', code?: string) {
    super(message, 404, true, code);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'El recurso ya existe', code?: string) {
    super(message, 409, true, code);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
export class ValidationError extends AppError {
  public readonly errors?: Record<string, string>[];

  constructor(
    message: string = 'Error de validación',
    errors?: Record<string, string>[],
    code?: string
  ) {
    super(message, 422, true, code);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Demasiadas solicitudes, intenta más tarde',
    retryAfter?: number,
    code?: string
  ) {
    super(message, 429, true, code);
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

/**
 * 500 Internal Server Error - Unexpected error
 */
export class InternalError extends AppError {
  constructor(message: string = 'Error interno del servidor', code?: string) {
    super(message, 500, false, code);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * 503 Service Unavailable - External service down
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Servicio no disponible', code?: string) {
    super(message, 503, true, code);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Error de base de datos', code?: string) {
    super(message, 500, false, code);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Utility to wrap unknown errors into AppError
 */
export function wrapError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message);
  }

  return new InternalError('Error desconocido');
}
