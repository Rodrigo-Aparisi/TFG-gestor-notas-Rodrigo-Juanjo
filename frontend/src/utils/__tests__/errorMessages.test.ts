import { getFriendlyErrorMessage } from '../errorMessages';

const axiosErr = (data: unknown) => ({ response: { data } });

describe('getFriendlyErrorMessage', () => {
  it('mapea un code conocido a su mensaje amigable (forma errorHandler)', () => {
    const e = axiosErr({
      success: false,
      error: { message: 'Contraseña incorrecta', code: 'INVALID_PASSWORD' },
    });
    expect(getFriendlyErrorMessage(e)).toBe('Contraseña incorrecta.');
  });

  it('nunca devuelve [object Object] con la forma-objeto sin code conocido', () => {
    const e = axiosErr({ success: false, error: { message: 'Algo concreto', code: 'WEIRD_CODE' } });
    expect(getFriendlyErrorMessage(e)).toBe('Algo concreto');
  });

  it('usa el string cuando error es un string (forma middleware)', () => {
    const e = axiosErr({ error: 'Acceso denegado' });
    expect(getFriendlyErrorMessage(e)).toBe('Acceso denegado');
  });

  it('une los mensajes de errores de validación por campo', () => {
    const e = axiosErr({
      error: 'Validación fallida',
      errors: [
        { field: 'email', message: 'Email inválido.' },
        { field: 'password', message: 'Muy corta.' },
      ],
    });
    expect(getFriendlyErrorMessage(e)).toBe('Email inválido. Muy corta.');
  });

  it('mapea CSRF_HEADER_MISSING', () => {
    const e = axiosErr({ error: 'CSRF...', code: 'CSRF_HEADER_MISSING' });
    expect(getFriendlyErrorMessage(e)).toBe(
      'Petición no válida. Recarga la página e inténtalo de nuevo.'
    );
  });

  it('cae al mensaje de un Error normal', () => {
    expect(getFriendlyErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('usa el fallback por defecto cuando no hay nada útil', () => {
    expect(getFriendlyErrorMessage({})).toBe('Ha ocurrido un error. Inténtalo de nuevo.');
  });

  it('respeta un fallback personalizado', () => {
    expect(getFriendlyErrorMessage({}, 'Error al guardar')).toBe('Error al guardar');
  });
});
