/**
 * Account Controller Tests
 *
 * Tests for user account management: getProfile, getUserSettings,
 * updateUserSettings, deleteAccount.
 */

import { Request, Response, NextFunction } from 'express';
import { accountController } from '../controllers/accountController';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../errors/AppError';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$mockhash'),
  compare: jest.fn(),
}));

// Mock the database
jest.mock('../database', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../utils/pathHelpers', () => ({
  safeDeleteFile: jest.fn().mockResolvedValue(true),
  extractSafeRelativePath: jest.fn((p: string) => p),
}));

jest.mock('../utils/urlHelpers', () => ({
  getBaseServerUrl: jest.fn(() => 'http://localhost:3001'),
  getProfileImageUrl: jest.fn((url: string | null) => url),
}));

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Import mocked pool
import { pool } from '../database';
const mockPool = pool as jest.Mocked<typeof pool>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authReq(
  body: Record<string, unknown> = {},
  user: { id: string; email: string } = { id: 'u-1', email: 'u@test.com' }
): Partial<Request> {
  return { body, user } as Partial<Request>;
}

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockNext(): jest.Mock {
  return jest.fn();
}

// ─── getProfile ───────────────────────────────────────────────────────────────

describe('accountController.getProfile', () => {
  it('returns 200 with user data when the query finds the user', async () => {
    const req = authReq();
    const res = mockRes();
    const next = mockNext();

    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'u-1',
          username: 'testuser',
          email: 'u@test.com',
          profile_image: null,
          created_at: new Date().toISOString(),
        },
      ],
      rowCount: 1,
    });

    await accountController.getProfile(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: 'u-1', username: 'testuser' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with a 404 NotFoundError when the query returns no rows', async () => {
    const req = authReq();
    const res = mockRes();
    const next = mockNext();

    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await accountController.getProfile(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect((next.mock.calls[0][0] as NotFoundError).statusCode).toBe(404);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ─── getUserSettings ──────────────────────────────────────────────────────────

describe('accountController.getUserSettings', () => {
  it('returns 200 with existing settings when found in the database', async () => {
    const req = authReq();
    const res = mockRes();
    const next = mockNext();

    const existingSettings = {
      user_id: 'u-1',
      theme: 'light',
      notifications_enabled: false,
      language: 'en',
    };

    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [existingSettings],
      rowCount: 1,
    });

    await accountController.getUserSettings(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(existingSettings);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 200 with default settings when none are stored in the database', async () => {
    const req = authReq();
    const res = mockRes();
    const next = mockNext();

    const defaultSettings = {
      user_id: 'u-1',
      theme: 'dark',
      notifications_enabled: true,
      language: 'es',
    };

    // First query: no settings found
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      // Second query: INSERT returns defaults
      .mockResolvedValueOnce({ rows: [defaultSettings], rowCount: 1 });

    await accountController.getUserSettings(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(defaultSettings);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── updateUserSettings ───────────────────────────────────────────────────────

describe('accountController.updateUserSettings', () => {
  it('returns 200 with updated settings after a successful update', async () => {
    const req = authReq({ theme: 'light', notifications_enabled: true, language: 'en' });
    const res = mockRes();
    const next = mockNext();

    const updatedSettings = {
      user_id: 'u-1',
      theme: 'light',
      notifications_enabled: true,
      language: 'en',
    };

    // First query: existing settings found
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ user_id: 'u-1' }], rowCount: 1 })
      // Second query: UPDATE returns the updated row
      .mockResolvedValueOnce({ rows: [updatedSettings], rowCount: 1 });

    await accountController.updateUserSettings(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(updatedSettings);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── deleteAccount ────────────────────────────────────────────────────────────

describe('accountController.deleteAccount', () => {
  it('calls next with an error when password is missing from the body', async () => {
    const req = authReq({});
    const res = mockRes();
    const next = mockNext();

    // Mock bcrypt.compare to throw when password is missing
    const bcrypt = require('bcrypt');
    (bcrypt.compare as jest.Mock).mockRejectedValueOnce(
      new Error('data and hash arguments required')
    );

    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'u-1',
          username: 'testuser',
          email: 'u@test.com',
          password: '$2b$10$mockhash',
          profile_image: null,
        },
      ],
      rowCount: 1,
    });

    await accountController.deleteAccount(req as Request, res as Response, next);

    // next must have been called with an error (TypeError from bcrypt)
    expect(next).toHaveBeenCalled();
    const calledError = (next as jest.Mock).mock.calls[0][0];
    expect(calledError).toBeInstanceOf(Error);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('calls next with a 401 UnauthorizedError when the password does not match', async () => {
    const req = authReq({ password: 'WrongPassword1' });
    const res = mockRes();
    const next = mockNext();

    // Mock bcrypt.compare to return false (password mismatch)
    const bcrypt = require('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'u-1',
          username: 'testuser',
          email: 'u@test.com',
          password: '$2b$10$mockhash',
          profile_image: null,
        },
      ],
      rowCount: 1,
    });

    await accountController.deleteAccount(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect((next.mock.calls[0][0] as UnauthorizedError).statusCode).toBe(401);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 200 and deletes the account when the password is correct', async () => {
    const req = authReq({ password: 'CorrectPass1' });
    const res = mockRes();
    const next = mockNext();

    // Mock bcrypt.compare to return true (password match)
    const bcrypt = require('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    // First query: SELECT user
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'u-1',
            username: 'testuser',
            email: 'u@test.com',
            password: '$2b$10$mockhash',
            profile_image: null,
          },
        ],
        rowCount: 1,
      })
      // Second query: DELETE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await accountController.deleteAccount(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cuenta eliminada exitosamente' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
