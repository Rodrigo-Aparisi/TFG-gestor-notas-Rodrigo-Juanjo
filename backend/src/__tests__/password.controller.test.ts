/**
 * Password Controller Tests
 *
 * Tests for password reset flow: requestReset, validateToken, resetPassword
 */

import { Request, Response } from 'express';
import { passwordController } from '../controllers/passwordController';

// Mock the database - includes both pool.query and pool.connect for transactions
jest.mock('../database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('../services/emailService', () => ({
  emailService: { sendPasswordResetEmail: jest.fn() },
}));

jest.mock('../config/logger', () => {
  const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
    log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => ({ toString: () => 'a'.repeat(80) })),
}));

import { pool } from '../database';
import { emailService } from '../services/emailService';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('passwordController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // requestReset
  // ---------------------------------------------------------------------------
  describe('requestReset', () => {
    it('returns 400 when email is missing', async () => {
      const req = { body: {} } as Request;
      const res = mockRes();

      await passwordController.requestReset(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El correo electrónico es requerido' });
    });

    it('returns 200 with generic message when email does not exist in DB', async () => {
      const req = { body: { email: 'noexiste@example.com' } } as Request;
      const res = mockRes();

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await passwordController.requestReset(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña',
      });
      // Must not have called emailService
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('generates token, executes 2 queries and sends email when email exists', async () => {
      const req = { body: { email: 'user@example.com' } } as Request;
      const res = mockRes();

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'user-id-1', username: 'testuser' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      mockEmailService.sendPasswordResetEmail.mockResolvedValueOnce(true);

      await passwordController.requestReset(req, res as Response);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'testuser'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña',
      });
    });

    it('returns 500 on database error', async () => {
      const req = { body: { email: 'user@example.com' } } as Request;
      const res = mockRes();

      mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

      await passwordController.requestReset(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al procesar la solicitud' });
    });
  });

  // ---------------------------------------------------------------------------
  // validateToken
  // ---------------------------------------------------------------------------
  describe('validateToken', () => {
    it('returns 400 when token param is undefined (query returns empty)', async () => {
      const req = { params: {} } as unknown as Request;
      const res = mockRes();

      // query runs with undefined token, returns no rows
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await passwordController.validateToken(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ valid: false });
    });

    it('returns 400 when token is not found or expired', async () => {
      const req = { params: { token: 'invalid-or-expired-token' } } as unknown as Request;
      const res = mockRes();

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await passwordController.validateToken(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ valid: false });
    });

    it('returns 200 with valid: true when token is valid', async () => {
      const req = { params: { token: 'valid-token-abc123' } } as unknown as Request;
      const res = mockRes();

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'token-row-id' }], rowCount: 1 });

      await passwordController.validateToken(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ valid: true });
    });
  });

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------
  describe('resetPassword', () => {
    it('returns 400 when token or newPassword is missing', async () => {
      const req = { body: { token: 'some-token' } } as Request;
      const res = mockRes();

      await passwordController.resetPassword(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token y nueva contraseña son requeridos' });
    });

    it('returns 400 when token does not exist in DB', async () => {
      const req = { body: { token: 'expired-token', newPassword: 'newPass123' } } as Request;
      const res = mockRes();

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await passwordController.resetPassword(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
    });

    it('returns 200, updates password and marks token as used when valid', async () => {
      const req = {
        body: { token: 'valid-reset-token', newPassword: 'newSecurePass!' },
      } as Request;
      const res = mockRes();

      // First pool.query: validate token
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'user-id-1' }], rowCount: 1 });

      // pool.connect returns a client with query and release methods
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      // Transaction queries: BEGIN, UPDATE users, UPDATE tokens, COMMIT
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({} as any) // UPDATE users
        .mockResolvedValueOnce({} as any) // UPDATE password_reset_tokens
        .mockResolvedValueOnce({} as any); // COMMIT

      await passwordController.resetPassword(req, res as Response);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['user-id-1'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE password_reset_tokens'),
        ['valid-reset-token']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contraseña actualizada correctamente' });
    });
  });
});
