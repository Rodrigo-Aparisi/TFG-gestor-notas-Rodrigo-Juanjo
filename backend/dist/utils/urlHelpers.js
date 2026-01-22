"use strict";
/**
 * URL Helper Utilities
 *
 * Centralized URL building functions to eliminate duplication
 * and ensure consistency across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiUrl = getApiUrl;
exports.getBaseServerUrl = getBaseServerUrl;
exports.getAppUrl = getAppUrl;
exports.getAppUrl2 = getAppUrl2;
exports.getProfileImageUrl = getProfileImageUrl;
exports.getNoteImageUrl = getNoteImageUrl;
exports.getGroupNoteImageUrl = getGroupNoteImageUrl;
exports.isGroupNoteImageUrl = isGroupNoteImageUrl;
exports.extractGroupNoteImageFilename = extractGroupNoteImageFilename;
exports.getPasswordResetUrl = getPasswordResetUrl;
exports.getRemindersUrl = getRemindersUrl;
/**
 * Default fallback URL for development
 */
const DEFAULT_API_URL = 'http://localhost:3001';
/**
 * Gets the base API URL from environment or uses default
 * @returns Base API URL (e.g., "http://localhost:3001/api")
 */
function getApiUrl() {
    return process.env.API_URL || `${DEFAULT_API_URL}/api`;
}
/**
 * Gets the base server URL (without /api suffix)
 * Used for serving static files, images, etc.
 * @returns Base server URL (e.g., "http://localhost:3001")
 */
function getBaseServerUrl() {
    const apiUrl = process.env.API_URL || DEFAULT_API_URL;
    return apiUrl.replace('/api', '');
}
/**
 * Gets the frontend application URL
 * @returns Frontend URL (e.g., "http://localhost:3000")
 */
function getAppUrl() {
    return process.env.APP_URL || 'http://localhost:3000';
}
/**
 * Gets the secondary app URL (used for image uploads in group notes)
 * @returns Secondary URL or base server URL
 */
function getAppUrl2() {
    return process.env.APP_URL_2 || getBaseServerUrl();
}
/**
 * Builds a full URL for a profile image
 * @param relativePath - Relative path like "/profile-images/photo.jpg"
 * @returns Full URL (e.g., "http://localhost:3001/profile-images/photo.jpg")
 */
function getProfileImageUrl(relativePath) {
    if (!relativePath)
        return null;
    const baseUrl = getBaseServerUrl();
    // Handle both "/profile-images/..." and "profile-images/..." formats
    const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${baseUrl}${cleanPath}`;
}
/**
 * Builds a full URL for a note image
 * @param filename - Image filename
 * @returns Full URL for the note image
 */
function getNoteImageUrl(filename) {
    const baseUrl = getBaseServerUrl();
    return `${baseUrl}/note-images/${filename}`;
}
/**
 * Builds a full URL for a group note image
 * @param filename - Image filename
 * @returns Full URL for the group note image
 */
function getGroupNoteImageUrl(filename) {
    const baseUrl = getAppUrl2();
    return `${baseUrl}/uploads/group-note-images/${filename}`;
}
/**
 * Checks if a URL is a group note image URL
 * @param url - URL to check
 * @returns True if URL points to group note images
 */
function isGroupNoteImageUrl(url) {
    const baseUrl = getAppUrl2();
    return url.startsWith(`${baseUrl}/uploads/group-note-images/`);
}
/**
 * Extracts filename from a group note image URL
 * @param url - Full image URL
 * @returns Filename or null if not a valid group note image URL
 */
function extractGroupNoteImageFilename(url) {
    if (!isGroupNoteImageUrl(url))
        return null;
    const parts = url.split('/');
    return parts[parts.length - 1] || null;
}
/**
 * Builds a password reset link
 * @param resetToken - Password reset token
 * @returns Full reset URL for the frontend
 */
function getPasswordResetUrl(resetToken) {
    const appUrl = getAppUrl();
    return `${appUrl}/reset-password/${resetToken}`;
}
/**
 * Builds a reminder link for the frontend
 * @returns Full URL to the reminders page
 */
function getRemindersUrl() {
    const appUrl = getAppUrl();
    return `${appUrl}/reminders`;
}
