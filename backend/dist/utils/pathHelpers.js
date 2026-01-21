"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSafePath = validateSafePath;
exports.safeDeleteFile = safeDeleteFile;
exports.isSafeFilename = isSafeFilename;
exports.sanitizeFilename = sanitizeFilename;
exports.extractSafeRelativePath = extractSafeRelativePath;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Path Security Helpers
 *
 * Utilities for preventing path traversal attacks
 */
/**
 * Validates that a file path is safe and within allowed directories
 *
 * @param filePath - The file path to validate
 * @param allowedDir - The base directory that paths must stay within
 * @returns Validated absolute path or null if unsafe
 *
 * @example
 * const safe = validateSafePath('/uploads/file.jpg', '/var/www/uploads');
 * // Returns: '/var/www/uploads/file.jpg' if safe, null if path traversal detected
 */
function validateSafePath(filePath, allowedDir) {
    try {
        // Normalize the paths to resolve .. and . segments
        const normalizedPath = path_1.default.normalize(filePath);
        const normalizedAllowedDir = path_1.default.normalize(allowedDir);
        // Resolve to absolute paths
        const absolutePath = path_1.default.resolve(normalizedAllowedDir, normalizedPath);
        const absoluteAllowedDir = path_1.default.resolve(normalizedAllowedDir);
        // Check if the resolved path starts with the allowed directory
        if (!absolutePath.startsWith(absoluteAllowedDir)) {
            console.warn(`Path traversal attempt detected: "${filePath}" escapes "${allowedDir}"`);
            return null;
        }
        // Additional check: ensure no .. remains in normalized path
        if (normalizedPath.includes('..')) {
            console.warn(`Path traversal attempt detected: "${filePath}" contains ".."`);
            return null;
        }
        return absolutePath;
    }
    catch (error) {
        console.error('Error validating path:', error);
        return null;
    }
}
/**
 * Safely deletes a file only if it exists within allowed directory
 *
 * @param filePath - Relative or absolute path to file
 * @param allowedDir - Base directory that file must be within
 * @returns true if deleted, false otherwise
 *
 * @example
 * safeDeleteFile('/uploads/profile-images/old.jpg', '/var/www/uploads');
 */
function safeDeleteFile(filePath, allowedDir) {
    try {
        const safePath = validateSafePath(filePath, allowedDir);
        if (!safePath) {
            console.warn(`Refusing to delete unsafe path: ${filePath}`);
            return false;
        }
        if (fs_1.default.existsSync(safePath)) {
            fs_1.default.unlinkSync(safePath);
            console.log(`File safely deleted: ${safePath}`);
            return true;
        }
        else {
            console.log(`File not found (already deleted?): ${safePath}`);
            return false;
        }
    }
    catch (error) {
        console.error(`Error deleting file: ${filePath}`, error);
        return false;
    }
}
/**
 * Validates that a filename is safe (no path components)
 *
 * @param filename - Filename to validate
 * @returns true if safe, false if contains path separators
 *
 * @example
 * isSafeFilename('photo.jpg') // true
 * isSafeFilename('../../../etc/passwd') // false
 * isSafeFilename('subdir/photo.jpg') // false
 */
function isSafeFilename(filename) {
    // Check for any path separators (Unix or Windows)
    if (filename.includes('/') || filename.includes('\\')) {
        console.warn(`Unsafe filename detected: ${filename}`);
        return false;
    }
    // Check for hidden files or special names
    if (filename.startsWith('.') || filename === '.' || filename === '..') {
        console.warn(`Suspicious filename detected: ${filename}`);
        return false;
    }
    // Check for null bytes (common in path traversal attacks)
    if (filename.includes('\0')) {
        console.warn(`Null byte detected in filename: ${filename}`);
        return false;
    }
    return true;
}
/**
 * Sanitizes a filename by removing dangerous characters
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars
        .replace(/\.{2,}/g, '.') // Replace multiple dots
        .replace(/^\.+/, '') // Remove leading dots
        .substring(0, 255); // Limit length
}
/**
 * Extracts safe relative path from database path
 *
 * @param dbPath - Path stored in database (e.g., '/uploads/profile-images/photo.jpg')
 * @param prefix - Prefix to remove (e.g., '/uploads/')
 * @returns Safe relative path or null if invalid
 */
function extractSafeRelativePath(dbPath, prefix = '/uploads/') {
    if (!dbPath || typeof dbPath !== 'string') {
        return null;
    }
    // Remove prefix
    const relativePath = dbPath.startsWith(prefix)
        ? dbPath.substring(prefix.length)
        : dbPath;
    // Validate that result doesn't contain path traversal
    if (relativePath.includes('..') || relativePath.includes('\0')) {
        console.warn(`Path traversal detected in DB path: ${dbPath}`);
        return null;
    }
    return relativePath;
}
