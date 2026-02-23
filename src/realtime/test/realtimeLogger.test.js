
import Logger from '../../logger.js';
import RealtimeLogger from '../realtimeLogger.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('RealtimeLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new RealtimeLogger({
      client: 'RT',
      successMessage: 'success',
      errorFetchingFeedMessage: 'fetch error',
      updateFeedMessage: 'feed update'
    });
  });

  it('should set default and custom messages', () => {
    expect(logger.client).toBe('RT');
    expect(logger.successMessage).toBe('success');
    expect(logger.errorMessage).toBe('fetch error');
    expect(logger.updateFeedMessage).toBe('feed update');
  });

  it('should call info with [UPDATE] and custom message', () => {
    logger.info = vi.fn();
    logger.updateFeed('custom');
    expect(logger.info).toHaveBeenCalledWith('[UPDATE] custom');
  });

  it('should call info with [UPDATE] and default updateFeedMessage', () => {
    logger.info = vi.fn();
    logger.updateFeed();
    expect(logger.info).toHaveBeenCalledWith('[UPDATE] feed update');
  });

  it('should call super.error with error if provided', () => {
    const spy = vi.spyOn(Logger.prototype, 'error');
    logger.errorFetchingFeed('err');
    expect(spy).toHaveBeenCalledWith('err');
    spy.mockRestore();
  });

  it('should call super.error with errorMessage if no error provided', () => {
    const spy = vi.spyOn(Logger.prototype, 'error');
    logger.errorMessage = 'fallback';
    logger.errorFetchingFeed();
    expect(spy).toHaveBeenCalledWith('fallback');
    spy.mockRestore();
  });
});
