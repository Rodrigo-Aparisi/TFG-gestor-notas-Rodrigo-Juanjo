"use strict";
/**
 * Winston Logger Configuration
 *
 * Provides structured logging with different levels and transports.
 * - Development: Colorized console output
 * - Production: JSON format with file logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, printf, colorize, json, errors } = winston_1.default.format;
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
const logDir = path_1.default.join(__dirname, '..', '..', 'logs');
/**
 * Create transports based on environment
 */
const transports = [
    // Console transport (always enabled)
    new winston_1.default.transports.Console({
        format: isProduction
            ? combine(timestamp(), json())
            : combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), devFormat),
    }),
];
// Add file transports in production
if (isProduction) {
    transports.push(
    // Error logs
    new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: combine(timestamp(), json()),
    }), 
    // Combined logs
    new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: combine(timestamp(), json()),
    }));
}
/**
 * Main logger instance
 */
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    defaultMeta: { service: 'olympus-scribe' },
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});
/**
 * Stream for Morgan HTTP logging integration
 */
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
/**
 * Helper functions for common log patterns
 */
exports.log = {
    /**
     * Log an API request
     */
    request: (method, path, userId) => {
        exports.logger.info(`${method} ${path}`, { userId, type: 'request' });
    },
    /**
     * Log a successful operation
     */
    success: (operation, details) => {
        exports.logger.info(`✓ ${operation}`, { ...details, type: 'success' });
    },
    /**
     * Log a failed operation
     */
    failure: (operation, error, details) => {
        exports.logger.error(`✗ ${operation}: ${error.message}`, {
            ...details,
            type: 'failure',
            stack: error.stack,
        });
    },
    /**
     * Log a database operation
     */
    db: (operation, table, details) => {
        exports.logger.debug(`DB: ${operation} on ${table}`, { ...details, type: 'database' });
    },
    /**
     * Log an authentication event
     */
    auth: (event, userId, details) => {
        exports.logger.info(`Auth: ${event}`, { userId, ...details, type: 'auth' });
    },
    /**
     * Log a security event
     */
    security: (event, details) => {
        exports.logger.warn(`Security: ${event}`, { ...details, type: 'security' });
    },
};
exports.default = exports.logger;
