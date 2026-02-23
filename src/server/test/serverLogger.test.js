import ServerLogger from '../serverLogger.js';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../logger.js', () => ({
  default: class MockLogger {
    constructor(options) {
      this.options = options;
    }
  }
}));

describe('ServerLogger', () => {
  it('should set default server messages and client', () => {
    const logger = new ServerLogger();
    expect(logger.client).toBe('SERVER');
    expect(logger.infoMessage).toBe('Server info.');
    expect(logger.successMessage).toBe('Server operation successful.');
    expect(logger.warnMessage).toBe('Server warning.');
    expect(logger.errorMessage).toBe('Server error encountered.');
  });

  it('should override defaults with options', () => {
    const logger = new ServerLogger({
      client: 'CUSTOM',
      infoMessage: 'i',
      successMessage: 's',
      warnMessage: 'w',
      errorMessage: 'e'
    });
    expect(logger.client).toBe('CUSTOM');
    expect(logger.infoMessage).toBe('i');
    expect(logger.successMessage).toBe('s');
    expect(logger.warnMessage).toBe('w');
    expect(logger.errorMessage).toBe('e');
  });
});
