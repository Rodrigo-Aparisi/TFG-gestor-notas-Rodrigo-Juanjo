/**
 * Database Mock for Testing
 *
 * This mock replaces the real PostgreSQL pool with a mock implementation
 * that can be controlled in tests.
 */

// Type definitions for mock query results
interface MockQueryResult {
  rows: unknown[];
  rowCount: number;
}

interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

// Mock pool implementation
const mockPool = {
  query: jest.fn() as jest.Mock<Promise<MockQueryResult>>,
  connect: jest.fn() as jest.Mock<Promise<MockClient>>,
};

// Helper to set mock query response
export const setMockQueryResult = (rows: unknown[], rowCount?: number): void => {
  mockPool.query.mockResolvedValueOnce({
    rows,
    rowCount: rowCount ?? rows.length,
  });
};

// Helper to set mock query error
export const setMockQueryError = (error: Error): void => {
  mockPool.query.mockRejectedValueOnce(error);
};

// Helper to reset all mocks
export const resetMocks = (): void => {
  mockPool.query.mockReset();
  mockPool.connect.mockReset();
};

// Mock client for transaction testing
export const createMockClient = (): MockClient => {
  const mockClient: MockClient = {
    query: jest.fn() as jest.Mock<Promise<MockQueryResult>>,
    release: jest.fn(),
  };

  mockPool.connect.mockResolvedValueOnce(mockClient);

  return mockClient;
};

// Export mock pool
export const pool = mockPool;

// Default export for jest.mock
export default mockPool;
