"use strict";
/**
 * Query Helpers - SQL Injection Prevention
 *
 * Utilities for safely building dynamic SQL queries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrderByClause = buildOrderByClause;
exports.buildGroupNoteOrderByClause = buildGroupNoteOrderByClause;
exports.buildReminderOrderByClause = buildReminderOrderByClause;
exports.isSafeColumnName = isSafeColumnName;
exports.escapeLikeValue = escapeLikeValue;
/**
 * Whitelist of allowed columns for ORDER BY clauses in notes table
 */
const ALLOWED_NOTE_ORDER_COLUMNS = [
    'created_at',
    'updated_at',
    'title',
    'is_pinned',
    'color'
];
/**
 * Whitelist of allowed sort directions
 */
const ALLOWED_SORT_DIRECTIONS = ['ASC', 'DESC'];
/**
 * Safely builds an ORDER BY clause for note queries
 *
 * @param field - The column to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns Safe ORDER BY clause or default
 *
 * @example
 * buildOrderByClause('title', 'ASC') // Returns: "title ASC, is_pinned DESC"
 * buildOrderByClause('invalid', 'ASC') // Returns: "is_pinned DESC, created_at DESC" (default)
 */
function buildOrderByClause(field, direction) {
    // Validate and sanitize field
    const sanitizedField = field?.toLowerCase();
    const isValidField = ALLOWED_NOTE_ORDER_COLUMNS.includes(sanitizedField);
    // Validate and sanitize direction
    const sanitizedDirection = direction?.toUpperCase();
    const isValidDirection = ALLOWED_SORT_DIRECTIONS.includes(sanitizedDirection);
    // Default sorting: pinned first, then by creation date
    const defaultOrder = 'is_pinned DESC, created_at DESC';
    // If invalid field or direction, return default
    if (!isValidField || !isValidDirection) {
        console.warn(`Invalid ORDER BY parameters: field="${field}", direction="${direction}". Using default.`);
        return defaultOrder;
    }
    // Special case: if sorting by title, also consider pinned status
    if (sanitizedField === 'title') {
        return `${sanitizedField} ${sanitizedDirection}, is_pinned DESC`;
    }
    // For other fields, include secondary sort
    return `${sanitizedField} ${sanitizedDirection}, created_at DESC`;
}
/**
 * Whitelist for group notes ORDER BY
 */
const ALLOWED_GROUP_NOTE_ORDER_COLUMNS = [
    'created_at',
    'updated_at',
    'title',
    'color'
];
/**
 * Safely builds an ORDER BY clause for group note queries
 *
 * @param field - The column to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns Safe ORDER BY clause or default
 */
function buildGroupNoteOrderByClause(field, direction) {
    const sanitizedField = field?.toLowerCase();
    const isValidField = ALLOWED_GROUP_NOTE_ORDER_COLUMNS.includes(sanitizedField);
    const sanitizedDirection = direction?.toUpperCase();
    const isValidDirection = ALLOWED_SORT_DIRECTIONS.includes(sanitizedDirection);
    const defaultOrder = 'created_at DESC';
    if (!isValidField || !isValidDirection) {
        console.warn(`Invalid GROUP NOTE ORDER BY parameters: field="${field}", direction="${direction}". Using default.`);
        return defaultOrder;
    }
    return `${sanitizedField} ${sanitizedDirection}`;
}
/**
 * Whitelist for reminders ORDER BY
 */
const ALLOWED_REMINDER_ORDER_COLUMNS = [
    'created_at',
    'updated_at',
    'date_time',
    'title'
];
/**
 * Safely builds an ORDER BY clause for reminder queries
 *
 * @param field - The column to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns Safe ORDER BY clause or default
 */
function buildReminderOrderByClause(field, direction) {
    const sanitizedField = field?.toLowerCase();
    const isValidField = ALLOWED_REMINDER_ORDER_COLUMNS.includes(sanitizedField);
    const sanitizedDirection = direction?.toUpperCase();
    const isValidDirection = ALLOWED_SORT_DIRECTIONS.includes(sanitizedDirection);
    const defaultOrder = 'date_time ASC, created_at DESC';
    if (!isValidField || !isValidDirection) {
        console.warn(`Invalid REMINDER ORDER BY parameters: field="${field}", direction="${direction}". Using default.`);
        return defaultOrder;
    }
    return `${sanitizedField} ${sanitizedDirection}`;
}
/**
 * Validates if a string is a safe column name (alphanumeric + underscore only)
 *
 * @param columnName - Column name to validate
 * @returns true if safe, false otherwise
 */
function isSafeColumnName(columnName) {
    // Only allow alphanumeric characters and underscores
    const safePattern = /^[a-zA-Z0-9_]+$/;
    return safePattern.test(columnName);
}
/**
 * Escapes a value for use in a LIKE clause
 *
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeLikeValue(value) {
    // Escape special characters in LIKE patterns: %, _, \
    return value.replace(/[%_\\]/g, '\\$&');
}
