/**
 * Centralized Error Handler Middleware
 *
 * This middleware catches all errors and formats them consistently.
 * It should be the LAST middleware in the Express chain.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, ValidationError, TooManyRequestsError } from '../errors';
import { logger } from '../config/logger';

/**
 * Error response structure
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    errors?: Record<string, string>[];
  };
}

/**
 * Determines if we're in production environment
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Handles known PostgreSQL errors
 */
function handleDatabaseError(error: Error & { code?: string }): AppError {
  const dbErrorCodes: Record<string, { message: string; status: number }> = {
    '23505': { message: 'El registro ya existe', status: 409 }, // Unique violation
    '23503': { message: 'Referencia inválida', status: 400 }, // Foreign key violation
    '23502': { message: 'Campo requerido faltante', status: 400 }, // Not null violation
    '22P02': { message: 'Formato de datos inválido', status: 400 }, // Invalid text representation
    '42P01': { message: 'Tabla no encontrada', status: 500 }, // Undefined table
    '42703': { message: 'Columna no encontrada', status: 500 }, // Undefined column
  };

  const dbError = dbErrorCodes[error.code || ''];
  if (dbError) {
    return new AppError(dbError.message, dbError.status, true, `DB_${error.code}`);
  }

  return new AppError('Error de base de datos', 500, false, 'DATABASE_ERROR');
}

/**
 * Handles JWT errors
 */
function handleJWTError(error: Error): AppError {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Token inválido', 401, true, 'INVALID_TOKEN');
  }
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expirado', 401, true, 'TOKEN_EXPIRED');
  }
  return new AppError('Error de autenticación', 401, true, 'AUTH_ERROR');
}

/**
 * Main error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  let error: AppError;

  // Convert known error types to AppError
  if (isAppError(err)) {
    error = err;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if ((err as Error & { code?: string }).code?.startsWith('2')) {
    // PostgreSQL error codes start with digits
    error = handleDatabaseError(err as Error & { code?: string });
  } else {
    // Unknown error - wrap it
    error = new AppError(isProduction ? 'Error interno del servidor' : err.message, 500, false);
  }

  // Log the error
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req as Request & { user?: { id: string } }).user?.id,
    statusCode: error.statusCode,
    code: error.code,
    stack: error.stack,
  };

  if (error.statusCode >= 500) {
    logger.error(error.message, logContext);
  } else if (error.statusCode >= 400) {
    logger.warn(error.message, logContext);
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
    },
  };

  // Add validation errors if present
  if (error instanceof ValidationError && error.errors) {
    response.error.errors = error.errors;
  }

  // Set retry-after header for rate limiting
  if (error instanceof TooManyRequestsError && error.retryAfter) {
    res.setHeader('Retry-After', error.retryAfter);
  }

  // Send response
  res.status(error.statusCode).json(response);
}

/**
 * Async handler wrapper to catch async errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    404,
    true,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}
