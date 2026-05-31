import { buildPartialUpdate } from '../utils/queryHelpers';

describe('buildPartialUpdate', () => {
  it('omite campos undefined y numera los placeholders desde startIndex por defecto (1)', () => {
    const { setClause, values, nextIndex } = buildPartialUpdate({
      title: 'Hola',
      content: undefined,
      color: 'red',
    });
    expect(setClause).toBe('title = $1, color = $2');
    expect(values).toEqual(['Hola', 'red']);
    expect(nextIndex).toBe(3);
  });

  it('respeta un startIndex personalizado', () => {
    const { setClause, values, nextIndex } = buildPartialUpdate(
      { can_edit: true, include_images: false },
      4
    );
    expect(setClause).toBe('can_edit = $4, include_images = $5');
    expect(values).toEqual([true, false]);
    expect(nextIndex).toBe(6);
  });

  it('incluye valores falsy válidos (false, 0, cadena vacía) pero no undefined', () => {
    const { setClause, values } = buildPartialUpdate({ a: 0, b: '', c: false, d: undefined });
    expect(setClause).toBe('a = $1, b = $2, c = $3');
    expect(values).toEqual([0, '', false]);
  });

  it('devuelve setClause vacío y nextIndex === startIndex cuando no hay campos definidos', () => {
    const { setClause, values, nextIndex } = buildPartialUpdate({ a: undefined }, 1);
    expect(setClause).toBe('');
    expect(values).toEqual([]);
    expect(nextIndex).toBe(1);
  });

  it('lanza un error si el nombre de columna no es seguro', () => {
    expect(() => buildPartialUpdate({ 'title; DROP TABLE notes': 'x' })).toThrow(/inseguro/);
  });
});
