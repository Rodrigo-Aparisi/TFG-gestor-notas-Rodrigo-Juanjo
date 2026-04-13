/**
 * Validate Middleware Tests
 *
 * Casos cubiertos para validate, validateParams, validateQuery:
 * - Body válido → next()
 * - Body inválido → 400 con error y array de errores Zod
 * - Campo requerido ausente → 400
 * - Error inesperado (no Zod) → 500
 * - Params válidos/inválidos
 * - Query válida/inválida
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateParams, validateQuery } from '../middleware/validate';

const testSchema = z.object({
  name: z.string().min(1, 'name is required'),
  age: z.number().int().positive('age must be positive'),
});

const makeReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const makeRes = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('validate middleware (body)', () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  it('llama a next() cuando el body es válido', async () => {
    const req = makeReq({ body: { name: 'Alice', age: 30 } }) as Request;
    const res = makeRes() as Response;

    await validate(testSchema)(req, res, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('devuelve 400 cuando el body es inválido', async () => {
    const req = makeReq({ body: { name: '', age: -5 } }) as Request;
    const res = makeRes() as Response;

    await validate(testSchema)(req, res, mockNext as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String) }),
        ]),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('devuelve 400 cuando falta un campo requerido', async () => {
    const req = makeReq({ body: { age: 25 } }) as Request; // name ausente
    const res = makeRes() as Response;

    await validate(testSchema)(req, res, mockNext as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando ocurre un error no-Zod inesperado', async () => {
    const brokenSchema = {
      parseAsync: async () => { throw new Error('Unexpected internal error'); },
    } as unknown as z.AnyZodObject;

    const req = makeReq({ body: {} }) as Request;
    const res = makeRes() as Response;

    await validate(brokenSchema)(req, res, mockNext as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('validar') })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('validateParams middleware', () => {
  let mockNext: jest.Mock;

  const paramsSchema = z.object({
    id: z.string().uuid('id must be a valid UUID'),
  });

  beforeEach(() => {
    mockNext = jest.fn();
  });

  it('llama a next() cuando los params son válidos', async () => {
    const req = makeReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }) as Request;
    const res = makeRes() as Response;

    await validateParams(paramsSchema)(req, res, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('devuelve 400 cuando el param es inválido', async () => {
    const req = makeReq({ params: { id: 'not-a-uuid' } }) as Request;
    const res = makeRes() as Response;

    await validateParams(paramsSchema)(req, res, mockNext as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ message: 'id must be a valid UUID' }),
        ]),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('validateQuery middleware', () => {
  let mockNext: jest.Mock;

  const querySchema = z.object({
    page: z.string().regex(/^\d+$/, 'page must be a number string'),
  });

  beforeEach(() => {
    mockNext = jest.fn();
  });

  it('llama a next() cuando la query es válida', async () => {
    const req = makeReq({ query: { page: '2' } }) as Request;
    const res = makeRes() as Response;

    await validateQuery(querySchema)(req, res, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('devuelve 400 cuando la query es inválida', async () => {
    const req = makeReq({ query: { page: 'abc' } }) as Request;
    const res = makeRes() as Response;

    await validateQuery(querySchema)(req, res, mockNext as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
