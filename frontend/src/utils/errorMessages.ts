/**
 * Mapeo de errores del backend a mensajes amigables para la UI.
 *
 * El backend responde con DOS formas según la ruta:
 *   1. errorHandler centralizado:  { success:false, error: { message, code, errors? } }
 *   2. middlewares/controladores:  { error: 'mensaje', details?, errors?: [{field,message}] }
 *
 * `getFriendlyErrorMessage` normaliza ambas, prioriza un mensaje por `code`
 * (consistente y localizado), y degrada con elegancia al mensaje del backend
 * o a un fallback genérico. Nunca devuelve "[object Object]".
 */

type FieldError = { field?: string; message?: string };

interface BackendErrorData {
  error?: string | { message?: string; code?: string };
  message?: string;
  code?: string;
  errors?: FieldError[];
}

/** Mensajes amigables por código de error conocido del backend. */
export const CODE_MESSAGES: Record<string, string> = {
  MISSING_FIELDS: 'Faltan campos obligatorios.',
  USER_EXISTS: 'Ese usuario o correo ya está registrado.',
  USER_NOT_FOUND: 'No existe una cuenta con ese correo.',
  INVALID_PASSWORD: 'Contraseña incorrecta.',
  INVALID_TOKEN: 'Tu sesión no es válida. Inicia sesión de nuevo.',
  TOKEN_EXPIRED: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  MISSING_REFRESH_TOKEN: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  INVALID_REFRESH_TOKEN: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  EXPIRED_REFRESH_TOKEN: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  CSRF_HEADER_MISSING: 'Petición no válida. Recarga la página e inténtalo de nuevo.',
  VALIDATION_ERROR: 'Hay datos inválidos en el formulario. Revísalos e inténtalo de nuevo.',
};

const DEFAULT_FALLBACK = 'Ha ocurrido un error. Inténtalo de nuevo.';

function extractCode(data: BackendErrorData): string | undefined {
  if (data.error && typeof data.error === 'object' && data.error.code) {
    return data.error.code;
  }
  return data.code;
}

/**
 * Devuelve un mensaje de error legible a partir de un error de axios (o cualquier
 * error), mapeando códigos conocidos del backend a textos amigables.
 */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_FALLBACK
): string {
  const data = (error as { response?: { data?: BackendErrorData } })?.response?.data;

  if (data && typeof data === 'object') {
    const code = extractCode(data);
    if (code && CODE_MESSAGES[code]) {
      return CODE_MESSAGES[code];
    }

    // Errores de validación por campo: unir los mensajes.
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const joined = data.errors
        .map(e => e.message)
        .filter(Boolean)
        .join(' ');
      if (joined) return joined;
    }

    if (typeof data.error === 'string') return data.error;
    if (data.error && typeof data.error === 'object' && data.error.message) {
      return data.error.message;
    }
    if (typeof data.message === 'string') return data.message;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
