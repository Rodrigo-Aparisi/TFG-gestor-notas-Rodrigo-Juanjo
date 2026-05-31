describe('validateEnv', () => {
  const original = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    // Restore by mutation instead of reference replacement
    Object.keys(process.env).forEach(key => {
      if (!(key in original)) delete process.env[key];
    });
    Object.assign(process.env, original);
  });

  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_NAME = 'db';

    const { validateEnv } = require('../config/env');
    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  it('throws when JWT_SECRET is shorter than 32 chars', () => {
    process.env.JWT_SECRET = 'tooshort';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_NAME = 'db';

    const { validateEnv } = require('../config/env');
    expect(() => validateEnv()).toThrow('32');
  });

  it('returns parsed config when all required vars are present', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_NAME = 'mydb';
    process.env.DB_PORT = '5432';
    process.env.NODE_ENV = 'test';

    const { validateEnv } = require('../config/env');
    const result = validateEnv();

    expect(result.JWT_SECRET).toHaveLength(32);
    expect(result.DB_PORT).toBe(5432);
    expect(result.NODE_ENV).toBe('test');
    expect(result.PORT).toBe(3001);
  });

  it('throws with readable message listing all missing vars', () => {
    delete process.env.JWT_SECRET;
    delete process.env.DB_HOST;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;

    const { validateEnv } = require('../config/env');
    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });
});
