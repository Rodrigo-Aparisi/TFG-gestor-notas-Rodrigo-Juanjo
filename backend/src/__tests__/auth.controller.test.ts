/**
 * Auth Controller Tests
 *
 * Tests for user authentication: register, login, refresh, logout
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { register, login, refreshAccessToken, logout } from '../controllers/auth.controller';
import {
  createTestUser,
  createLoginRequest,
  createRegisterRequest,
  generateTestToken,
  generateTestRefreshToken,
} from './testUtils';

// Mock the database
jest.mock('../database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  log: {
    auth: jest.fn(),
    security: jest.fn(),
    request: jest.fn(),
    success: jest.fn(),
    failure: jest.fn(),
  },
}));

// Import mocked pool
import { pool } from '../database';
const mockPool = pool as jest.Mocked<typeof pool>;

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      cookies: {},
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = createRegisterRequest();
      mockReq.body = registerData;

      const mockUser = createTestUser({
        username: registerData.username,
        email: registerData.email,
      });

      // Mock the INSERT query
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Usuario creado exitosamente',
          user: expect.objectContaining({
            username: registerData.username,
            email: registerData.email,
          }),
        })
      );
    });

    it('should return error when user already exists', async () => {
      const registerData = createRegisterRequest();
      mockReq.body = registerData;

      // Mock duplicate key error
      const duplicateError = new Error('duplicate key') as Error & { code: string };
      duplicateError.code = '23505';
      (mockPool.query as jest.Mock).mockRejectedValueOnce(duplicateError);

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'El usuario o correo ya existe',
          statusCode: 400,
        })
      );
    });

    it('should return error when fields are missing', async () => {
      mockReq.body = { email: 'test@example.com' }; // Missing username and password

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Todos los campos son requeridos',
          statusCode: 400,
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = createLoginRequest();
      mockReq.body = loginData;

      const hashedPassword = await bcrypt.hash(loginData.password, 10);
      const mockUser = createTestUser({
        email: loginData.email,
        password_hash: hashedPassword,
      });

      // Mock user query - returns user with 'password' field
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockUser.id,
              username: mockUser.username,
              email: mockUser.email,
              password: hashedPassword, // Controller expects 'password' not 'password_hash'
              profile_image: mockUser.profile_image,
              created_at: mockUser.created_at,
            },
          ],
          rowCount: 1,
        })
        // Mock refresh token INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Mock settings query
        .mockResolvedValueOnce({
          rows: [{ theme: 'dark', notifications_enabled: true, language: 'es' }],
          rowCount: 1,
        });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login exitoso',
          token: expect.any(String),
          user: expect.objectContaining({
            email: loginData.email,
          }),
        })
      );
    });

    it('should return error when user not found', async () => {
      const loginData = createLoginRequest({ email: 'notfound@example.com' });
      mockReq.body = loginData;

      // Mock empty user query result
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Correo no encontrado',
          statusCode: 404,
        })
      );
    });

    it('should return error when password is incorrect', async () => {
      const loginData = createLoginRequest();
      mockReq.body = loginData;

      // Hash a different password
      const wrongPasswordHash = await bcrypt.hash('DifferentPassword123', 10);
      const mockUser = createTestUser({ email: loginData.email });

      // Mock user query with wrong password
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            ...mockUser,
            password: wrongPasswordHash,
          },
        ],
        rowCount: 1,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Contraseña incorrecta',
          statusCode: 401,
        })
      );
    });

    it('should return error when fields are missing', async () => {
      mockReq.body = { email: 'test@example.com' }; // Missing password

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Todos los campos son requeridos',
          statusCode: 400,
        })
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const userId = 'test-user-id-123';
      const refreshToken = generateTestRefreshToken(userId);
      mockReq.body = {};
      mockReq.cookies = { refresh_token: refreshToken };

      const mockUser = createTestUser({ id: userId });

      // Mock token query - token exists and is valid
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { token: refreshToken, user_id: userId, expires_at: new Date(Date.now() + 86400000) },
          ],
          rowCount: 1,
        })
        // Mock user query
        .mockResolvedValueOnce({
          rows: [{ id: mockUser.id, username: mockUser.username, email: mockUser.email }],
          rowCount: 1,
        });

      await refreshAccessToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token renovado exitosamente',
          token: expect.any(String),
        })
      );
    });

    it('should return error when refresh token is missing', async () => {
      mockReq.body = {};
      mockReq.cookies = {};

      await refreshAccessToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh token requerido',
          statusCode: 401,
        })
      );
    });

    it('should return error when refresh token is invalid', async () => {
      mockReq.body = {};
      mockReq.cookies = { refresh_token: 'invalid-token' };

      await refreshAccessToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh token inválido',
          statusCode: 403,
        })
      );
    });

    it('should return error when refresh token not in database', async () => {
      const userId = 'test-user-id-123';
      const refreshToken = generateTestRefreshToken(userId);
      mockReq.body = {};
      mockReq.cookies = { refresh_token: refreshToken };

      // Mock token query - token not found
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await refreshAccessToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh token inválido o expirado',
          statusCode: 403,
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully with both tokens', async () => {
      const userId = 'test-user-id-123';
      const accessToken = generateTestToken(userId);
      const refreshToken = generateTestRefreshToken(userId);

      mockReq.body = {};
      mockReq.cookies = { refresh_token: refreshToken };
      mockReq.headers = { authorization: `Bearer ${accessToken}` };

      // Mock INSERT revoked token
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Mock DELETE refresh token
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout exitoso',
        })
      );
    });

    it('should logout successfully without refresh token', async () => {
      const userId = 'test-user-id-123';
      const accessToken = generateTestToken(userId);

      mockReq.body = {};
      mockReq.headers = { authorization: `Bearer ${accessToken}` };

      // Mock INSERT revoked token
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout exitoso',
        })
      );
    });

    it('should logout successfully without any tokens', async () => {
      mockReq.body = {};
      mockReq.headers = {};

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout exitoso',
        })
      );
    });
  });
});
