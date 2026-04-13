/**
 * Auth Middleware Tests — authenticateToken
 *
 * Casos cubiertos:
 * - Token ausente → 401
 * - Token válido → next() + req.user poblado
 * - Refresh token usado como access token → 401
 * - Token expirado → 401 + code TOKEN_EXPIRED
 * - Token malformado → 403 + code INVALID_TOKEN
 * - Token firmado con secreto incorrecto → 403
 * - Token en blacklist → 403
 * - Error de BD al comprobar blacklist → 403 (fail-closed)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';

jest.mock('../database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../database';
const mockPool = pool as jest.Mocked<typeof pool>;

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const makeAccessToken = (
  payload: Record<string, unknown> = {},
  expiresIn = 3600
): string => jwt.sign({ id: 'user-id-abc', email: 'user@test.com', ...payload }, JWT_SECRET, { expiresIn });

const makeExpiredToken = (userId = 'user-id-abc'): string => {
  const iat = Math.floor(Date.now() / 1000) - 7200;
  const exp = Math.floor(Date.now() / 1000) - 3600;
  return jwt.sign({ id: userId, email: 'user@test.com', iat, exp }, JWT_SECRET);
};

const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  body: {},
  ...overrides,
});

const mockRes = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('authenticateToken middleware', () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
  });

  describe('token ausente', () => {
    it('devuelve 401 cuando no hay header Authorization', async () => {
      const req = mockReq({ headers: {} }) as Request;
      const res = mockRes() as Response;

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('token válido', () => {
    it('llama a next() y establece req.user', async () => {
      const token = makeAccessToken({ id: 'user-xyz' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } }) as Request;
      const res = mockRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith();
      expect((req as Request & { user?: { id: string } }).user?.id).toBe('user-xyz');
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('refresh token usado como access token', () => {
    it('devuelve 401', async () => {
      const refreshToken = jwt.sign(
        { id: 'user-xyz', email: 'user@test.com', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: 604800 }
      );
      const req = mockReq({ headers: { authorization: `Bearer ${refreshToken}` } }) as Request;
      const res = mockRes() as Response;

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('token expirado', () => {
    it('devuelve 401 con code TOKEN_EXPIRED', async () => {
      const expiredToken = makeExpiredToken();
      const req = mockReq({ headers: { authorization: `Bearer ${expiredToken}` } }) as Request;
      const res = mockRes() as Response;

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TOKEN_EXPIRED' })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('token malformado o con secreto incorrecto', () => {
    it('devuelve 403 con code INVALID_TOKEN para token garbage', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer this.is.garbage' } }) as Request;
      const res = mockRes() as Response;

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TOKEN' })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('devuelve 403 para token firmado con secreto distinto', async () => {
      const badToken = jwt.sign({ id: 'user-xyz', email: 'user@test.com' }, 'wrong-secret', { expiresIn: 3600 });
      const req = mockReq({ headers: { authorization: `Bearer ${badToken}` } }) as Request;
      const res = mockRes() as Response;

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('token en blacklist', () => {
    it('devuelve 403 cuando el token aparece en revoked_tokens', async () => {
      const token = makeAccessToken({ id: 'user-xyz' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } }) as Request;
      const res = mockRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ token }], rowCount: 1 });

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('revoked') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('error de BD al comprobar blacklist', () => {
    it('devuelve 403 (fail-closed)', async () => {
      const token = makeAccessToken({ id: 'user-xyz' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } }) as Request;
      const res = mockRes() as Response;

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB connection lost'));

      await authenticateToken(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
