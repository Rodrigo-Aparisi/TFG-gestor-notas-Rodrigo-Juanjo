/**
 * Password Validation Helpers
 *
 * Helpers para validar la fortaleza de contraseñas según estándares de seguridad.
 */

export interface PasswordRequirement {
  regex: RegExp;
  message: string;
  label: string;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    regex: /.{8,}/,
    message: 'La contraseña debe tener al menos 8 caracteres',
    label: 'Mínimo 8 caracteres'
  },
  {
    regex: /[A-Z]/,
    message: 'La contraseña debe incluir al menos una letra mayúscula',
    label: 'Al menos una mayúscula (A-Z)'
  },
  {
    regex: /[a-z]/,
    message: 'La contraseña debe incluir al menos una letra minúscula',
    label: 'Al menos una minúscula (a-z)'
  },
  {
    regex: /[0-9]/,
    message: 'La contraseña debe incluir al menos un número',
    label: 'Al menos un número (0-9)'
  }
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    label: string;
    met: boolean;
  }[];
}

/**
 * Valida la fortaleza de una contraseña según los requisitos definidos
 * @param password - Contraseña a validar
 * @returns Objeto con resultado de validación y detalles
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const requirements = PASSWORD_REQUIREMENTS.map(req => {
    const met = req.regex.test(password);
    if (!met) {
      errors.push(req.message);
    }
    return {
      label: req.label,
      met
    };
  });

  return {
    isValid: errors.length === 0,
    errors,
    requirements
  };
}

/**
 * Genera un mensaje de error descriptivo para contraseñas inválidas
 * @param password - Contraseña a validar
 * @returns String con los errores o null si es válida
 */
export function getPasswordErrorMessage(password: string): string | null {
  const result = validatePasswordStrength(password);

  if (result.isValid) {
    return null;
  }

  return 'La contraseña no cumple los requisitos:\n' + result.errors.join('\n');
}

/**
 * Verifica si una contraseña es débil (menos de 8 caracteres)
 * Útil para usuarios existentes que queremos migrar gradualmente
 */
export function isWeakPassword(password: string): boolean {
  return password.length < 8;
}
