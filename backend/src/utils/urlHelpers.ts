/**
 * URL Helper Utilities
 *
 * Centralized URL building functions to eliminate duplication
 * and ensure consistency across the application
 */

/**
 * Default fallback URL for development
 */
const DEFAULT_API_URL = 'http://localhost:3001';

/**
 * Gets the base API URL from environment or uses default
 * @returns Base API URL (e.g., "http://localhost:3001/api")
 */
export function getApiUrl(): string {
  return process.env.API_URL || `${DEFAULT_API_URL}/api`;
}

/**
 * Gets the base server URL (without /api suffix)
 * Used for serving static files, images, etc.
 * @returns Base server URL (e.g., "http://localhost:3001")
 */
export function getBaseServerUrl(): string {
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  return apiUrl.replace('/api', '');
}

/**
 * Gets the frontend application URL
 * @returns Frontend URL (e.g., "http://localhost:3000")
 */
export function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

/**
 * Gets the secondary app URL (used for image uploads in group notes)
 * @returns Secondary URL or base server URL
 */
export function getAppUrl2(): string {
  return process.env.APP_URL_2 || getBaseServerUrl();
}

/**
 * Builds a full URL for a profile image
 * @param relativePath - Relative path like "/profile-images/photo.jpg"
 * @returns Full URL (e.g., "http://localhost:3001/profile-images/photo.jpg")
 */
export function getProfileImageUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;

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
export function getNoteImageUrl(filename: string): string {
  const baseUrl = getBaseServerUrl();
  return `${baseUrl}/note-images/${filename}`;
}

/**
 * Builds a full URL for a group note image
 * @param filename - Image filename
 * @returns Full URL for the group note image
 */
export function getGroupNoteImageUrl(filename: string): string {
  const baseUrl = getAppUrl2();
  return `${baseUrl}/uploads/group-note-images/${filename}`;
}

/**
 * Checks if a URL is a group note image URL
 * @param url - URL to check
 * @returns True if URL points to group note images
 */
export function isGroupNoteImageUrl(url: string): boolean {
  const baseUrl = getAppUrl2();
  return url.startsWith(`${baseUrl}/uploads/group-note-images/`);
}

/**
 * Extracts filename from a group note image URL
 * @param url - Full image URL
 * @returns Filename or null if not a valid group note image URL
 */
export function extractGroupNoteImageFilename(url: string): string | null {
  if (!isGroupNoteImageUrl(url)) return null;

  const parts = url.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Builds a password reset link
 * @param resetToken - Password reset token
 * @returns Full reset URL for the frontend
 */
export function getPasswordResetUrl(resetToken: string): string {
  const appUrl = getAppUrl();
  return `${appUrl}/reset-password/${resetToken}`;
}

/**
 * Builds a reminder link for the frontend
 * @returns Full URL to the reminders page
 */
export function getRemindersUrl(): string {
  const appUrl = getAppUrl();
  return `${appUrl}/reminders`;
}
