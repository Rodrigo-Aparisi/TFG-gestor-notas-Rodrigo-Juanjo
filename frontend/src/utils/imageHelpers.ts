/**
 * Image utilities for handling profile images and uploads
 */

/**
 * Constructs the full URL for a profile image
 * Handles both full URLs and relative paths
 * @param url - The image URL or path
 * @returns Full image URL
 */
export const getFullImageUrl = (url: string | undefined): string => {
  if (!url) return '';

  // If URL is already a complete path, return as is
  if (url.startsWith('http') || url.startsWith('/uploads/')) {
    return url;
  }

  // If it's just a filename, construct the full path
  return `/uploads/profile-images/${url.split('/').pop()}`;
};

/**
 * Validates if a file is an image by checking its type
 * @param file - File to validate
 * @returns True if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Validates image file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes (default: 5MB)
 * @returns True if file size is acceptable
 */
export const validateImageSize = (file: File, maxSizeMB: number = 5): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Gets a preview URL for an image file
 * Remember to revoke the URL when done: URL.revokeObjectURL(url)
 * @param file - Image file
 * @returns Preview URL
 */
export const getImagePreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};
