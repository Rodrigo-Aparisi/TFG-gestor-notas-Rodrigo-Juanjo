/**
 * Test Utilities
 *
 * Helper functions and factories for creating test data.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Test user data factory
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'test-user-id-123',
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2b$10$test-hash-here',
  profile_image: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Test note data factory
export const createTestNote = (overrides: Partial<TestNote> = {}): TestNote => ({
  id: 'test-note-id-123',
  title: 'Test Note Title',
  content: 'Test note content here',
  user_id: 'test-user-id-123',
  images: [],
  is_pinned: false,
  is_marked: false,
  is_deleted: false,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Test group data factory
export const createTestGroup = (overrides: Partial<TestGroup> = {}): TestGroup => ({
  id: 'test-group-id-123',
  name: 'Test Group',
  description: 'Test group description',
  color: '#ffc600',
  owner_id: 'test-user-id-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Generate valid JWT for testing
export const generateTestToken = (
  userId: string = 'test-user-id-123',
  expiresInSeconds: number = 3600 // 1 hour
): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: expiresInSeconds }
  );
};

// Generate refresh token for testing
// Note: The auth controller verifies refresh tokens with JWT_SECRET (not JWT_REFRESH_SECRET)
export const generateTestRefreshToken = (
  userId: string = 'test-user-id-123',
  expiresInSeconds: number = 604800 // 7 days
): string => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: expiresInSeconds }
  );
};

// Generate expired token for testing
export const generateExpiredToken = (userId: string = 'test-user-id-123'): string => {
  // Create a token that's already expired by setting exp in the past
  const payload = {
    id: userId,
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-jwt-secret');
};

// Hash password for test user creation
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// Type definitions
export interface TestUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestNote {
  id: string;
  title: string;
  content: string;
  user_id: string;
  images: string[];
  is_pinned: boolean;
  is_marked: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Request body factories
export const createLoginRequest = (overrides: Partial<LoginRequest> = {}): LoginRequest => ({
  email: 'test@example.com',
  password: 'TestPassword123',
  ...overrides,
});

export const createRegisterRequest = (overrides: Partial<RegisterRequest> = {}): RegisterRequest => ({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'NewUserPass123',
  ...overrides,
});

export const createNoteRequest = (overrides: Partial<CreateNoteRequest> = {}): CreateNoteRequest => ({
  title: 'New Test Note',
  content: 'This is test note content',
  images: [],
  ...overrides,
});

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  images?: string[];
}

// Mock Express request/response helpers
export const mockRequest = (overrides: Record<string, unknown> = {}): MockRequest => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides,
});

export const mockResponse = (): MockResponse => {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

export const mockNext = jest.fn();

export interface MockRequest {
  body: Record<string, unknown>;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
  user: { id: string } | null;
}

export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}
