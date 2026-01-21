/**
 * Date formatting utilities for the application
 * Provides consistent date formatting across all components
 */

/**
 * Formats a date string to a human-readable format in Spanish
 * @param dateString - ISO date string to format
 * @returns Formatted date string (e.g., "21 de enero de 2026, 14:30")
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);

  // Verify valid date
  if (isNaN(date.getTime())) return '';

  // Spanish locale options
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return date.toLocaleDateString('es-ES', options);
};

/**
 * Returns a relative time string (e.g., "hace 5 minutos", "hace 2 horas")
 * Falls back to full date for older dates (30+ days)
 * @param dateString - ISO date string to format
 * @returns Relative time string in Spanish
 */
export const getTimeAgo = (dateString: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);

  // Verify valid date
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) {
    return 'hace un momento';
  } else if (diffMin < 60) {
    return `hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`;
  } else if (diffHour < 24) {
    return `hace ${diffHour} hora${diffHour === 1 ? '' : 's'}`;
  } else if (diffDay < 30) {
    return `hace ${diffDay} día${diffDay === 1 ? '' : 's'}`;
  } else {
    // For older dates, show full date
    return formatDate(dateString);
  }
};

/**
 * Formats a date for input fields (YYYY-MM-DD)
 * @param date - Date object or ISO string
 * @returns Formatted date string for input fields
 */
export const formatDateForInput = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Formats a date and time for datetime-local input fields (YYYY-MM-DDTHH:mm)
 * @param date - Date object or ISO string
 * @returns Formatted datetime string for input fields
 */
export const formatDateTimeForInput = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Checks if a date is in the future
 * @param dateString - ISO date string to check
 * @returns True if date is in the future
 */
export const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  return date.getTime() > new Date().getTime();
};

/**
 * Checks if a date is today
 * @param dateString - ISO date string to check
 * @returns True if date is today
 */
export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Formats a date in short format (e.g., "5 ene")
 * @param date - The date to format
 * @returns Formatted date string in Spanish short format
 */
export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
};
