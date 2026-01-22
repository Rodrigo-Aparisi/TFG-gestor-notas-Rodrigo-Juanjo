/**
 * Jest Test Setup
 *
 * This file runs before each test suite to configure the test environment.
 * It sets up mocks, environment variables, and cleanup handlers.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.APP_URL = 'http://localhost:3000';
process.env.APP_URL_2 = 'http://localhost:5000';

// Increase timeout for async operations
jest.setTimeout(10000);

// Global beforeAll - runs once before all tests
beforeAll(() => {
  // Suppress console.log in tests unless DEBUG=true
  if (process.env.DEBUG !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  }
});

// Global afterAll - runs once after all tests
afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global afterEach - runs after each test
afterEach(() => {
  // Clear all mocks between tests
  jest.clearAllMocks();
});

// Custom matchers for better test assertions
expect.extend({
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },

  toHaveStatusCode(received: { status: number }, expected: number) {
    const pass = received.status === expected;

    if (pass) {
      return {
        message: () => `expected response not to have status code ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have status code ${expected}, but got ${received.status}`,
        pass: false,
      };
    }
  },
});

// Extend Jest types for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
      toHaveStatusCode(expected: number): R;
    }
  }
}

export {};
