import DOMPurify from 'dompurify';

/**
 * Configuración de DOMPurify para sanitizar HTML
 *
 * Permite tags básicos de formato pero bloquea scripts y contenido peligroso
 */

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 's', 'strike',
  'br', 'p', 'div', 'span',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code',
  'a'
];

const ALLOWED_ATTR = [
  'href', 'title', 'target',
  'class', 'id'
];

/**
 * Sanitiza HTML para prevenir XSS
 *
 * Permite HTML básico de formato pero elimina:
 * - <script> tags
 * - <iframe> tags
 * - Event handlers (onclick, onerror, etc.)
 * - javascript: URLs
 * - Otros vectores de XSS
 *
 * @param dirty - String potencialmente peligroso con HTML
 * @returns String sanitizado y seguro para renderizar
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true
  });
}

/**
 * Sanitiza texto plano (elimina TODO el HTML)
 *
 * Útil para títulos, nombres de usuario, etc.
 * donde no queremos ningún HTML
 *
 * @param text - Texto potencialmente con HTML
 * @returns Texto plano sin HTML
 */
export function sanitizePlainText(text: string): string {
  if (!text) return '';

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

/**
 * Verifica si un string contiene HTML potencialmente peligroso
 *
 * @param str - String a verificar
 * @returns true si contiene contenido peligroso
 */
export function containsDangerousHTML(str: string): boolean {
  if (!str) return false;

  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<object\b/gi,
    /<embed\b/gi,
    /<link\b/gi,
    /<style\b/gi
  ];

  return dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitiza un array de strings
 *
 * @param arr - Array de strings a sanitizar
 * @param plainText - Si true, elimina todo HTML; si false, permite tags básicos
 * @returns Array sanitizado
 */
export function sanitizeArray(arr: string[], plainText: boolean = false): string[] {
  return arr.map(item => plainText ? sanitizePlainText(item) : sanitizeHTML(item));
}

/**
 * Hook de React para sanitizar contenido antes de renderizar
 * Uso: const clean = useSanitizedHTML(dirtyHTML);
 */
export function useSanitizedHTML(dirty: string): string {
  return sanitizeHTML(dirty);
}
