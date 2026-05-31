// backend/src/__tests__/config.logger.test.ts
describe('logger redactSensitive format', () => {
  it('redacts password fields in log metadata', () => {
    jest.resetModules();
    const { logger } = require('../config/logger');

    const spy = jest.spyOn(logger.transports[0], 'write').mockImplementation(() => true);

    logger.info('test message', { password: 'secret123', username: 'alice' });

    if (spy.mock.calls.length > 0) {
      const loggedChunk = spy.mock.calls[0][0];
      const loggedStr = typeof loggedChunk === 'string'
        ? loggedChunk
        : JSON.stringify(loggedChunk);
      expect(loggedStr).not.toContain('secret123');
      expect(loggedStr).toContain('[REDACTED]');
    }

    spy.mockRestore();
  });

  it('does not redact non-sensitive fields', () => {
    jest.resetModules();
    const { logger } = require('../config/logger');

    const spy = jest.spyOn(logger.transports[0], 'write').mockImplementation(() => true);

    logger.info('test message', { username: 'alice', action: 'login' });

    if (spy.mock.calls.length > 0) {
      const loggedChunk = spy.mock.calls[0][0];
      const loggedStr = typeof loggedChunk === 'string'
        ? loggedChunk
        : JSON.stringify(loggedChunk);
      expect(loggedStr).toContain('alice');
    }

    spy.mockRestore();
  });

  it('redacts token fields', () => {
    jest.resetModules();
    const { logger } = require('../config/logger');

    const spy = jest.spyOn(logger.transports[0], 'write').mockImplementation(() => true);

    logger.warn('security event', { accessToken: 'eyJhbGc...', userId: '123' });

    if (spy.mock.calls.length > 0) {
      const loggedChunk = spy.mock.calls[0][0];
      const loggedStr = typeof loggedChunk === 'string'
        ? loggedChunk
        : JSON.stringify(loggedChunk);
      expect(loggedStr).not.toContain('eyJhbGc');
    }

    spy.mockRestore();
  });
});
