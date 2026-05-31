/**
 * Winston Logger Configuration
 *
 * Provides structured logging with different levels and transports.
 * - Development: Colorized console output
 * - Production: JSON format with file logging
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

/**
 * List of keys whose values must never appear in logs.
 */
const SENSITIVE_KEYS = [
  'password', 'currentpassword', 'newpassword', 'confirmpassword',
  'token', 'accesstoken', 'refreshtoken', 'authorization',
  'jwt_secret', 'email_app_password', 'secret',
];

/**
 * Winston format that replaces sensitive field values with [REDACTED].
 * Applied before all other formats so no transport ever sees the raw value.
 */
const redactSensitive = winston.format((info) => {
  const redact = (obj: Record<string, unknown>, seen = new WeakSet()): void => {
    if (seen.has(obj)) return;
    seen.add(obj);
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (obj[key] !== null && typeof obj[key] === 'object') {
        redact(obj[key] as Record<string, unknown>, seen);
      }
    }
  };
  redact(info as unknown as Record<string, unknown>);
  return info;
});

/**
 * Custom log format for development (readable in console)
 */
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

/**
 * Determine environment
 */
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

/**
 * Log directory for file transports
 */
const logDir = path.join(__dirname, '..', '..', 'logs');

/**
 * Create transports based on environment
 */
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), json())
      : combine(
          colorize({ all: true }),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          devFormat
        ),
  }),
];

// Add file transports in production
if (isProduction) {
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(timestamp(), json()),
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(timestamp(), json()),
    })
  );
}

/**
 * Main logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: redactSensitive(),
  defaultMeta: { service: 'olympus-scribe' },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP logging integration
 */
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

/**
 * Helper functions for common log patterns
 */
export const log = {
  /**
   * Log an API request
   */
  request: (method: string, path: string, userId?: string): void => {
    logger.info(`${method} ${path}`, { userId, type: 'request' });
  },

  /**
   * Log a successful operation
   */
  success: (operation: string, details?: Record<string, unknown>): void => {
    logger.info(`✓ ${operation}`, { ...details, type: 'success' });
  },

  /**
   * Log a failed operation
   */
  failure: (operation: string, error: Error, details?: Record<string, unknown>): void => {
    logger.error(`✗ ${operation}: ${error.message}`, {
      ...details,
      type: 'failure',
      stack: error.stack,
    });
  },

  /**
   * Log a database operation
   */
  db: (operation: string, table: string, details?: Record<string, unknown>): void => {
    logger.debug(`DB: ${operation} on ${table}`, { ...details, type: 'database' });
  },

  /**
   * Log an authentication event
   */
  auth: (event: string, userId?: string, details?: Record<string, unknown>): void => {
    logger.info(`Auth: ${event}`, { userId, ...details, type: 'auth' });
  },

  /**
   * Log a security event
   */
  security: (event: string, details: Record<string, unknown>): void => {
    logger.warn(`Security: ${event}`, { ...details, type: 'security' });
  },
};

export default logger;
