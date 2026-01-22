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
