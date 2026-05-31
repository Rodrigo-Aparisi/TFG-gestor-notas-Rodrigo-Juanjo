const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
jest.mock('../database', () => ({
  pool: { connect: jest.fn().mockResolvedValue(mockClient) },
}));

import { withTransaction } from '../utils/db';

describe('withTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  it('envuelve la función en BEGIN/COMMIT y devuelve su resultado', async () => {
    const result = await withTransaction(async client => {
      await client.query('SELECT 1');
      return 'ok';
    });

    expect(result).toBe('ok');
    const calls = mockClient.query.mock.calls.map(c => c[0]);
    expect(calls[0]).toBe('BEGIN');
    expect(calls).toContain('COMMIT');
    expect(calls).not.toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('hace ROLLBACK y re-lanza si la función falla', async () => {
    const boom = new Error('boom');

    await expect(
      withTransaction(async () => {
        throw boom;
      })
    ).rejects.toBe(boom);

    const calls = mockClient.query.mock.calls.map(c => c[0]);
    expect(calls[0]).toBe('BEGIN');
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('libera el cliente incluso si la query falla', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BOOM') return Promise.reject(new Error('query fail'));
      return Promise.resolve({ rows: [] });
    });

    await expect(withTransaction(client => client.query('BOOM'))).rejects.toThrow('query fail');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
